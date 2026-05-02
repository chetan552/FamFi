import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supa;
import 'dart:math';
import '../../core/models/models.dart';
import '../../core/services/google_tasks_service.dart';
import '../auth/auth_provider.dart';

part 'family_provider.g.dart';

class FamilyState {
  final Family? family;
  final UserProfile? currentUserProfile;
  final List<UserProfile> children;
  final List<UserProfile> members;
  final List<Chore> chores;
  final List<BucketTemplate> bucketTemplates;
  final List<Bucket> buckets;
  final List<Transaction> transactions;
  final List<InterestSetting> interestSettings;
  final bool googleConnected;
  final List<GoogleTaskMapping> googleMappings;
  final bool loading;
  final String? error;

  FamilyState({
    this.family, 
    this.currentUserProfile,
    this.children = const [], 
    this.members = const [], 
    this.chores = const [],
    this.bucketTemplates = const [],
    this.buckets = const [],
    this.transactions = const [],
    this.interestSettings = const [],
    this.googleConnected = false,
    this.googleMappings = const [],
    this.loading = false,
    this.error,
  });

  FamilyState copyWith({
    Family? family, 
    UserProfile? currentUserProfile,
    List<UserProfile>? children, 
    List<UserProfile>? members, 
    List<Chore>? chores,
    List<BucketTemplate>? bucketTemplates,
    List<Bucket>? buckets,
    List<Transaction>? transactions,
    List<InterestSetting>? interestSettings,
    bool? googleConnected,
    List<GoogleTaskMapping>? googleMappings,
    bool? loading,
    String? error,
    bool clearError = false,
  }) {
    return FamilyState(
      family: family ?? this.family,
      currentUserProfile: currentUserProfile ?? this.currentUserProfile,
      children: children ?? this.children,
      members: members ?? this.members,
      chores: chores ?? this.chores,
      bucketTemplates: bucketTemplates ?? this.bucketTemplates,
      buckets: buckets ?? this.buckets,
      transactions: transactions ?? this.transactions,
      interestSettings: interestSettings ?? this.interestSettings,
      googleConnected: googleConnected ?? this.googleConnected,
      googleMappings: googleMappings ?? this.googleMappings,
      loading: loading ?? this.loading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

@Riverpod(keepAlive: true)
class FamilyNotifier extends _$FamilyNotifier {
  final _supabase = supa.Supabase.instance.client;
  bool _isFetching = false;

  @override
  FamilyState build() {
    return FamilyState();
  }

  Future<void> fetchFamily() async {
    final authUser = ref.read(authProvider);
    if (authUser == null) return;

    // Guard against duplicate concurrent fetches
    if (_isFetching) return;
    _isFetching = true;

    state = state.copyWith(loading: true, clearError: true);

    try {
      final profileRes = await _supabase.from('users').select().eq('auth_id', authUser.id).maybeSingle();
      if (profileRes == null || profileRes['family_id'] == null) {
        state = state.copyWith(
          loading: false,
          currentUserProfile: profileRes != null ? UserProfile.fromJson(profileRes) : null,
        );
        return;
      }

      final familyId = profileRes['family_id'];

      // Run all independent queries in parallel
      final results = await Future.wait([
        _supabase.from('families').select().eq('id', familyId).single(),
        _supabase.from('users').select().eq('family_id', familyId).eq('role', 'parent').order('created_at'),
        _supabase.from('users').select().eq('family_id', familyId).eq('role', 'child').order('created_at'),
        _supabase.from('chores').select().eq('family_id', familyId).order('created_at'),
        _supabase.from('bucket_templates').select().eq('family_id', familyId).eq('is_active', true).order('sort_order'),
      ]);

      final familyRes = results[0] as Map<String, dynamic>;
      final membersRes = results[1] as List;
      final childrenRes = results[2] as List;
      final choresRes = results[3] as List;
      final templatesRes = results[4] as List;
      
      final now = DateTime.now();
      final childIds = childrenRes.map((c) => c['id']).toList();
      List<dynamic> bucketsRes = [];
      List<dynamic> transactionsRes = [];
      if (childIds.isNotEmpty) {
        bucketsRes = await _supabase.from('buckets').select().inFilter('child_id', childIds).eq('month', now.month).eq('year', now.year);
        // Fetch transactions associated with these kids
        final bucketIds = bucketsRes.map((b) => b['id']).toList();
        if (bucketIds.isNotEmpty) {
           transactionsRes = await _supabase.from('transactions').select().inFilter('bucket_id', bucketIds).order('created_at', ascending: false).limit(100);
        }
      }

      state = state.copyWith(
        family: Family.fromJson(familyRes),
        currentUserProfile: UserProfile.fromJson(profileRes),
        members: membersRes.map((m) => UserProfile.fromJson(m)).toList(),
        children: childrenRes.map((c) => UserProfile.fromJson(c)).toList(),
        chores: choresRes.map((c) => Chore.fromJson(c)).toList(),
        bucketTemplates: templatesRes.map((t) => BucketTemplate.fromJson(t)).toList(),
        buckets: bucketsRes.map((b) => Bucket.fromJson(b)).toList(),
        transactions: transactionsRes.map((tx) => Transaction.fromJson(tx)).toList(),
        interestSettings: state.interestSettings,
        googleConnected: state.googleConnected,
        googleMappings: state.googleMappings,
        loading: false,
      );
      
      // Fetch interest settings and check Google connection in parallel
      await Future.wait([
        fetchInterestSettings(),
        checkGoogleConnection(),
      ]);
    } catch (e) {
      state = state.copyWith(loading: false, error: e.toString());
    } finally {
      _isFetching = false;
    }
  }

  Future<void> joinFamily(String inviteCode) async {
    state = state.copyWith(loading: true);
    final authUser = ref.read(authProvider);
    if (authUser == null) return;

    try {
      final familyData = await _supabase.from('families').select('id').eq('invite_code', inviteCode.toUpperCase()).maybeSingle();
      if (familyData == null) throw Exception('Invalid invite code');

      // Update user profile
      final profileRes = await _supabase.from('users').select('id').eq('auth_id', authUser.id).maybeSingle();
      if (profileRes != null) {
        await _supabase.from('users').update({'family_id': familyData['id']}).eq('id', profileRes['id']);
      }
      
      await fetchFamily();
    } catch (e) {
      state = state.copyWith(loading: false);
      rethrow;
    }
  }

  Future<void> createFamily(String name) async {
    state = state.copyWith(loading: true);
    final authUser = ref.read(authProvider);
    if (authUser == null) return;

    try {
      final inviteCode = _generateInviteCode();

      final familyData = await _supabase.from('families').insert({
        'name': name,
        'invite_code': inviteCode,
        'created_by': authUser.id,
      }).select().single();

      final profileRes = await _supabase.from('users').select('id').eq('auth_id', authUser.id).maybeSingle();
      if (profileRes != null) {
        await _supabase.from('users').update({'family_id': familyData['id']}).eq('id', profileRes['id']);
      }

      await fetchFamily();
    } catch (e) {
      state = state.copyWith(loading: false);
      rethrow;
    }
  }

  Future<void> updateChoreStatus(String choreId, String status) async {
    state = state.copyWith(loading: true);
    try {
      await _supabase.from('chores').update({'status': status}).eq('id', choreId);
      await fetchFamily();
    } catch (e) {
      state = state.copyWith(loading: false);
      rethrow;
    }
  }

  Future<void> deleteChore(String choreId) async {
    state = state.copyWith(loading: true);
    try {
      await _supabase.from('chores').delete().eq('id', choreId);
      await fetchFamily();
    } catch (e) {
      state = state.copyWith(loading: false);
      rethrow;
    }
  }

  Future<void> createChore(
    String childId,
    String title,
    double value,
    String? dueDate,
    bool isRecurring,
    String? recurrencePeriod,
  ) async {
    state = state.copyWith(loading: true);
    if (state.family == null) return;
    try {
      await _supabase.from('chores').insert({
        'family_id': state.family!.id,
        'assigned_to_child_id': childId,
        'title': title,
        'value': value,
        'due_date': dueDate,
        'status': 'assigned',
        'is_recurring': isRecurring,
        'recurrence_period': isRecurring ? recurrencePeriod : null,
      });
      await fetchFamily();
    } catch (e) {
      state = state.copyWith(loading: false);
      rethrow;
    }
  }

  Future<void> updateChore(
    String choreId,
    String childId,
    String title,
    double value,
    String? dueDate,
    bool isRecurring,
    String? recurrencePeriod,
  ) async {
    state = state.copyWith(loading: true);
    try {
      await _supabase.from('chores').update({
        'assigned_to_child_id': childId,
        'title': title,
        'value': value,
        'due_date': dueDate,
        'is_recurring': isRecurring,
        'recurrence_period': isRecurring ? recurrencePeriod : null,
      }).eq('id', choreId);
      await fetchFamily();
    } catch (e) {
      state = state.copyWith(loading: false);
      rethrow;
    }
  }

  Future<void> checkGoogleConnection() async {
    final userId = state.currentUserProfile?.id ?? 
        (await _supabase.from('users').select('id').eq('auth_id', _supabase.auth.currentUser?.id ?? '').maybeSingle())?['id'];
    
    if (userId == null) return;
    
    try {
      final token = await _supabase.from('google_tokens').select('id').eq('user_id', userId).maybeSingle();
      state = state.copyWith(googleConnected: token != null);
    } catch (e, stack) {
      debugPrint('Error in checkGoogleConnection: $e\n$stack');
    }
  }

  Future<void> fetchGoogleMappings() async {
    if (state.family == null) return;
    try {
      final data = await _supabase.from('google_task_mappings').select('*').eq('family_id', state.family!.id);
      final mappings = (data as List).map((m) => GoogleTaskMapping.fromJson(m)).toList();
      state = state.copyWith(googleMappings: mappings);
    } catch (e, stack) {
      debugPrint('Error in fetchGoogleMappings: $e\n$stack');
    }
  }

  Future<void> saveGoogleTokens(String accessToken, String? refreshToken, int expiresIn) async {
    final authId = _supabase.auth.currentUser?.id;
    if (authId == null) throw Exception('No user authenticated');

    final profile = await _supabase.from('users').select('id').eq('auth_id', authId).maybeSingle();
    final userId = profile?['id'];

    if (userId == null) throw Exception('User profile not found');

    final expiresAt = DateTime.now().toUtc().add(Duration(seconds: expiresIn)).toIso8601String();
    final existing = await _supabase.from('google_tokens').select('id').eq('user_id', userId).maybeSingle();
    
    final tokenData = <String, dynamic>{
      'user_id': userId,
      'access_token': accessToken,
      'expires_at': expiresAt,
    };
    if (refreshToken != null) {
      tokenData['refresh_token'] = refreshToken;
    }

    if (existing != null) {
      await _supabase.from('google_tokens').update(tokenData).eq('id', existing['id']);
    } else {
      await _supabase.from('google_tokens').insert(tokenData);
    }
    
    state = state.copyWith(googleConnected: true);
    await fetchFamily();
  }

  Future<void> disconnectGoogle() async {
    final userId = state.currentUserProfile?.id ?? 
        (await _supabase.from('users').select('id').eq('auth_id', _supabase.auth.currentUser?.id ?? '').maybeSingle())?['id'];
        
    if (userId == null) return;
    await _supabase.from('google_tokens').delete().eq('user_id', userId);
    state = state.copyWith(googleConnected: false, googleMappings: []);
  }

  Future<void> saveGoogleMapping(String tasklistId, String title, String childId, double reward) async {
    if (state.family == null) return;
    await _supabase.from('google_task_mappings').insert({
      'family_id': state.family!.id,
      'google_tasklist_id': tasklistId,
      'google_tasklist_title': title,
      'child_id': childId,
      'default_reward': reward,
      'created_by_user_id': state.currentUserProfile?.id,
    });
    await fetchGoogleMappings();
  }

  Future<void> updateGoogleMappingReward(String mappingId, double reward) async {
    await _supabase.from('google_task_mappings').update({'default_reward': reward}).eq('id', mappingId);
    await fetchGoogleMappings();
  }

  Future<void> deleteGoogleMapping(String mappingId) async {
    await _supabase.from('google_task_mappings').delete().eq('id', mappingId);
    await fetchGoogleMappings();
  }

  Future<Map<String, dynamic>> syncGoogleTasks() async {
    final userId = state.currentUserProfile?.id ?? 
        (await _supabase.from('users').select('id').eq('auth_id', _supabase.auth.currentUser?.id ?? '').maybeSingle())?['id'];
    final familyId = state.family?.id;
    
    if (userId == null || familyId == null) {
      return {'synced': 0, 'errors': ['Not logged in or no family.']};
    }
    
    state = state.copyWith(loading: true);
    try {
      final service = GoogleTasksService(_supabase);
      final result = await service.syncTasksForFamily(userId, familyId);
      await fetchFamily();
      final errors = result['errors'] as List;
      if (errors.isNotEmpty) {
        // Re-check connection in case the token was deleted (e.g. invalid_grant)
        await checkGoogleConnection();
      }
      return result;
    } finally {
      state = state.copyWith(loading: false);
    }
  }

  Future<void> processPayday(String childId, Map<String, double> distributions, List<String> choreIds) async {
    state = state.copyWith(loading: true);
    final user = ref.read(authProvider);
    if (user == null || state.family == null) return;
    try {
      // Build bucket amounts list, creating buckets as needed
      final bucketAmounts = <Map<String, dynamic>>[];
      for (final entry in distributions.entries) {
        final templateId = entry.key;
        final amount = entry.value;
        if (amount <= 0) continue;

        final bucketId = await _getOrCreateBucket(childId, templateId);
        bucketAmounts.add({'bucket_id': bucketId, 'amount': amount});
      }

      // Use SECURITY DEFINER RPC to bypass transactions RLS
      await _supabase.rpc('process_payday', params: {
        'p_child_id': childId,
        'p_bucket_amounts': bucketAmounts,
        'p_chore_ids': choreIds,
      });

      await fetchFamily();
    } catch (e) {
      state = state.copyWith(loading: false);
      rethrow;
    }
  }

  String _generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    final random = Random.secure();
    return List.generate(6, (index) => chars[random.nextInt(chars.length)]).join();
  }

  Future<void> fetchInterestSettings() async {
    if (state.family == null) return;
    try {
      final res = await _supabase.from('interest_settings').select().eq('family_id', state.family!.id);
      state = state.copyWith(
        interestSettings: (res as List).map((i) => InterestSetting.fromJson(i)).toList(),
      );
    } catch (e) {
      print('Error fetching interest settings: $e');
    }
  }

  Future<void> saveInterestSetting(String templateId, double ratePercent, bool matchEnabled) async {
    if (state.family == null) return;
    try {
      await _supabase.from('interest_settings').upsert({
        'family_id': state.family!.id,
        'template_id': templateId,
        'rate_percent': ratePercent,
        'match_enabled': matchEnabled,
      }, onConflict: 'family_id,template_id');
      await fetchInterestSettings();
    } catch (e) {
      throw Exception('Failed to save interest setting: $e');
    }
  }

  Future<int> processInterest() async {
    if (state.family == null) return 0;
    try {
      final response = await _supabase.rpc('process_monthly_interest', params: {'p_family_id': state.family!.id});
      await fetchFamily();
      return response as int? ?? 0;
    } catch (e) {
      throw Exception('RPC Error: process_monthly_interest failed: $e');
    }
  }

  Future<void> addChild(String name, String avatarEmoji) async {
    if (state.family == null) return;
    try {
      await _supabase.from('users').insert({
        'family_id': state.family!.id,
        'role': 'child',
        'name': name,
        'avatar_emoji': avatarEmoji,
      });
      await fetchFamily();
    } catch (e) {
      throw Exception('Failed to add child: $e');
    }
  }

  Future<void> updateChild(String id, String name, String avatarEmoji) async {
    try {
      await _supabase.from('users').update({
        'name': name,
        'avatar_emoji': avatarEmoji,
      }).eq('id', id);
      await fetchFamily();
    } catch (e) {
      throw Exception('Failed to update child: $e');
    }
  }

  Future<void> removeChild(String id) async {
    try {
      await _supabase.from('users').delete().eq('id', id);
      await fetchFamily();
    } catch (e) {
      throw Exception('Failed to remove child: $e');
    }
  }

  Future<void> createBucketTemplate(String name, String emoji, String color) async {
    if (state.family == null) return;
    try {
      await _supabase.from('bucket_templates').insert({
        'family_id': state.family!.id,
        'name': name,
        'emoji': emoji,
        'color': color,
        'sort_order': state.bucketTemplates.length,
        'is_active': true,
      });
      await fetchFamily();
    } catch (e) {
      throw Exception('Failed to create bucket template: $e');
    }
  }

  Future<void> updateBucketTemplate(String id, String name, String emoji, String color) async {
    try {
      await _supabase.from('bucket_templates').update({
        'name': name,
        'emoji': emoji,
        'color': color,
      }).eq('id', id);
      await fetchFamily();
    } catch (e) {
      throw Exception('Failed to update bucket template: $e');
    }
  }

  Future<void> deleteBucketTemplate(String id) async {
    try {
      await _supabase.from('bucket_templates').update({'is_active': false}).eq('id', id);
      await fetchFamily();
    } catch (e) {
      throw Exception('Failed to delete bucket template: $e');
    }
  }

  Future<String> _getOrCreateBucket(String childId, String templateId) async {
    final now = DateTime.now();
    final month = now.month;
    final year = now.year;

    final existing = await _supabase.from('buckets').select('id')
        .eq('child_id', childId)
        .eq('template_id', templateId)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle();

    if (existing != null) {
      return existing['id'] as String;
    }

    final newBucket = await _supabase.from('buckets').insert({
      'child_id': childId,
      'template_id': templateId,
      'month': month,
      'year': year,
    }).select('id').single();

    return newBucket['id'] as String;
  }

  Future<void> addGift(String childId, String templateId, double amount, String description) async {
    try {
      final bucketId = await _getOrCreateBucket(childId, templateId);
      await _supabase.from('transactions').insert({
        'bucket_id': bucketId,
        'child_id': childId,
        'amount': amount,
        'type': 'gift',
        'description': description,
        'status': 'completed',
      });
      await fetchFamily();
    } catch (e) {
      throw Exception('Failed to add gift: $e');
    }
  }

  Future<void> withdrawFromBucket(String childId, String templateId, double amount, String description) async {
    try {
      final now = DateTime.now();
      final month = now.month;
      final year = now.year;

      final bucket = await _supabase.from('buckets').select('id, cached_balance')
          .eq('child_id', childId)
          .eq('template_id', templateId)
          .eq('month', month)
          .eq('year', year)
          .maybeSingle();

      if (bucket == null) throw Exception('No balance found in this bucket.');
      
      final balance = (bucket['cached_balance'] as num).toDouble();
      if (balance < amount) {
        throw Exception('Insufficient balance. Available: \$${balance.toStringAsFixed(2)}');
      }

      await _supabase.from('transactions').insert({
        'bucket_id': bucket['id'],
        'child_id': childId,
        'amount': -amount,
        'type': 'withdrawal',
        'description': description.isNotEmpty ? description : 'Withdrawal',
        'status': 'completed',
      });
      
      await fetchFamily();
    } catch (e) {
      throw Exception('Failed to withdraw: $e');
    }
  }

  Future<void> updateProfile(String name, String avatarEmoji) async {
    final authUser = ref.read(authProvider);
    if (authUser == null) return;
    
    try {
      await _supabase.from('users').update({
        'name': name,
        'avatar_emoji': avatarEmoji,
      }).eq('auth_id', authUser.id);
      await fetchFamily();
    } catch (e) {
      throw Exception('Failed to update profile: $e');
    }
  }

  Future<void> renameFamily(String name) async {
    if (state.family == null) return;
    
    try {
      await _supabase.from('families').update({
        'name': name,
      }).eq('id', state.family!.id);
      await fetchFamily();
    } catch (e) {
      throw Exception('Failed to rename family: $e');
    }
  }

  Future<void> deleteMultipleChores(List<String> choreIds) async {
    if (choreIds.isEmpty) return;
    try {
      await _supabase.from('chores').delete().inFilter('id', choreIds);
      await fetchFamily();
    } catch (e) {
      throw Exception('Failed to delete chores: $e');
    }
  }

  Future<void> clearCompletedChores() async {
    if (state.family == null) return;
    try {
      await _supabase.from('chores')
          .delete()
          .eq('family_id', state.family!.id)
          .inFilter('status', ['done', 'approved']);
      await fetchFamily();
    } catch (e) {
      throw Exception('Failed to clear completed chores: $e');
    }
  }

  Future<void> clearAllChores() async {
    if (state.family == null) return;
    try {
      await _supabase.from('chores').delete().eq('family_id', state.family!.id);
      await fetchFamily();
    } catch (e) {
      throw Exception('Failed to clear all chores: $e');
    }
  }

  Future<void> clearTransactionHistory() async {
    if (state.family == null) return;
    try {
      final bucketIds = state.buckets.map((b) => b.id).where((id) => id.isNotEmpty).toList();
      if (bucketIds.isNotEmpty) {
        await _supabase.from('transactions').delete().inFilter('bucket_id', bucketIds);
        for (final bucketId in bucketIds) {
          await _supabase.from('buckets').update({'cached_balance': 0}).eq('id', bucketId);
        }
      }
      await fetchFamily();
    } catch (e) {
      throw Exception('Failed to clear transaction history: $e');
    }
  }

  Future<void> resetInterestSettings() async {
    if (state.family == null) return;
    try {
      await _supabase.from('interest_settings').delete().eq('family_id', state.family!.id);
      await fetchFamily();
    } catch (e) {
      throw Exception('Failed to reset interest settings: $e');
    }
  }

  Future<void> regenerateFamilyInviteCode() async {
    if (state.family == null) return;
    
    try {
      final newInviteCode = _generateInviteCode();
      await _supabase.from('families').update({
        'invite_code': newInviteCode,
      }).eq('id', state.family!.id);
      await fetchFamily();
    } catch (e) {
      throw Exception('Failed to regenerate invite code: $e');
    }
  }
}
