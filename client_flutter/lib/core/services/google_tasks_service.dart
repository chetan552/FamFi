import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/models/models.dart';

class GoogleTasksService {
  static const String _tasksApi = 'https://tasks.googleapis.com/tasks/v1';
  static const String _tokenUrl = 'https://oauth2.googleapis.com/token';

  final SupabaseClient supabase;
  
  // These should ideally be injected from environment variables in your real app setup
  // matching the EXPO_PUBLIC_... variables in the .env
  static const String clientId = '83074924250-g7qivb86nqkkjndi5ri1gjsqk4bps4lh.apps.googleusercontent.com';
  static const String clientSecret = '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';

  GoogleTasksService(this.supabase);

  Future<Map<String, dynamic>> exchangeCodeForTokens(String code, String redirectUri) async {
    final response = await http.post(
      Uri.parse(_tokenUrl),
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: {
        'client_id': clientId,
        'client_secret': clientSecret,
        'code': code,
        'grant_type': 'authorization_code',
        'redirect_uri': redirectUri,
      },
    );

    if (response.statusCode != 200) {
      throw Exception('Token exchange failed: ${response.body}');
    }
    return jsonDecode(response.body);
  }

  Future<Map<String, dynamic>> refreshAccessToken(String refreshToken) async {
    final response = await http.post(
      Uri.parse(_tokenUrl),
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: {
        'client_id': clientId,
        'client_secret': clientSecret,
        'refresh_token': refreshToken,
        'grant_type': 'refresh_token',
      },
    );

    if (response.statusCode != 200) {
      throw Exception('Token refresh failed: ${response.body}');
    }
    return jsonDecode(response.body);
  }

  Future<String> getValidAccessTokenForUser(String userId) async {
    final tokenData = await supabase.from('google_tokens').select('*').eq('user_id', userId).maybeSingle();
    if (tokenData == null) throw Exception('Google account not connected.');

    final expiresAt = DateTime.parse(tokenData['expires_at']);
    final now = DateTime.now();

    if (expiresAt.difference(now).inMinutes < 5) {
      final refreshToken = tokenData['refresh_token'] as String?;
      if (refreshToken == null) throw Exception('No refresh token stored. Please reconnect.');
      
      final refreshed = await refreshAccessToken(refreshToken);
      final newExpiresAt = now.add(Duration(seconds: refreshed['expires_in']));

      await supabase.from('google_tokens').update({
        'access_token': refreshed['access_token'],
        'expires_at': newExpiresAt.toIso8601String(),
      }).eq('id', tokenData['id']);

      return refreshed['access_token'] as String;
    }

    return tokenData['access_token'] as String;
  }

  Future<List<Map<String, dynamic>>> fetchTaskLists(String accessToken) async {
    final response = await http.get(
      Uri.parse('$_tasksApi/users/@me/lists'),
      headers: {'Authorization': 'Bearer $accessToken'},
    );

    if (response.statusCode != 200) throw Exception('Failed to fetch task lists: ${response.statusCode}');
    final data = jsonDecode(response.body);
    return List<Map<String, dynamic>>.from(data['items'] ?? []);
  }

  Future<List<Map<String, dynamic>>> fetchTasks(String accessToken, String taskListId, {bool showCompleted = true}) async {
    final uri = Uri.parse('$_tasksApi/lists/$taskListId/tasks').replace(queryParameters: {
      'maxResults': '100',
      'showCompleted': showCompleted.toString(),
      'showHidden': 'true',
    });

    final response = await http.get(uri, headers: {'Authorization': 'Bearer $accessToken'});

    if (response.statusCode != 200) throw Exception('Failed to fetch tasks: ${response.statusCode}');
    final data = jsonDecode(response.body);
    return List<Map<String, dynamic>>.from(data['items'] ?? []);
  }

  Future<Map<String, dynamic>> syncTasksForFamily(String userId, String familyId) async {
    final errors = <String>[];
    int synced = 0;

    String accessToken;
    try {
      accessToken = await getValidAccessTokenForUser(userId);
    } catch (e) {
      return {'synced': 0, 'errors': ['Google connection error: $e']};
    }

    final mappingsData = await supabase.from('google_task_mappings').select('*').eq('family_id', familyId);
    if (mappingsData.isEmpty) {
      return {'synced': 0, 'errors': ['No task lists mapped.']};
    }

    for (final rawMapping in mappingsData) {
      final mapping = GoogleTaskMapping.fromJson(rawMapping);
      try {
        final tasks = await fetchTasks(accessToken, mapping.googleTasklistId);

        for (final task in tasks) {
          final title = task['title'] as String?;
          if (title == null || title.trim().isEmpty) continue;

          final existingChore = await supabase.from('chores')
              .select('id, status')
              .eq('google_task_id', task['id'])
              .eq('family_id', familyId)
              .maybeSingle();

          final taskStatus = task['status'] == 'completed' ? 'done' : 'assigned';

          if (existingChore != null) {
            if (task['status'] == 'completed' && existingChore['status'] == 'assigned') {
              await supabase.from('chores').update({'status': 'done'}).eq('id', existingChore['id']);
              synced++;
            }
          } else {
            double rewardValue = mapping.defaultReward;
            final notes = task['notes'] as String?;
            if (notes != null) {
              final match = RegExp(r'\$(\d+(?:\.\d{1,2})?)').firstMatch(notes);
              if (match != null && match.group(1) != null) {
                final parsed = double.tryParse(match.group(1)!);
                if (parsed != null) rewardValue = parsed;
              }
            }

            final dueDateStr = task['due'] as String?;
            final dueDate = dueDateStr != null ? dueDateStr.split('T')[0] : null;

            await supabase.from('chores').insert({
              'family_id': familyId,
              'assigned_to_child_id': mapping.childId,
              'title': title,
              'value': rewardValue,
              'status': taskStatus,
              'due_date': dueDate,
              'source': 'google_tasks',
              'google_task_id': task['id'],
              'is_recurring': false,
            });
            synced++;
          }
        }

        await supabase.from('google_task_mappings')
            .update({'last_synced_at': DateTime.now().toIso8601String()})
            .eq('id', mapping.id);

      } catch (e) {
        errors.add('Error syncing "${mapping.googleTasklistTitle}": $e');
      }
    }

    return {'synced': synced, 'errors': errors};
  }
}
