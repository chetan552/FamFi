import 'dart:ui';
import 'package:collection/collection.dart';
import 'package:flutter/foundation.dart';

@immutable
class Family {
  final String id;
  final String name;
  final String inviteCode;
  final String createdBy;
  final DateTime createdAt;

  const Family({required this.id, required this.name, required this.inviteCode, required this.createdBy, required this.createdAt});

  factory Family.fromJson(Map<String, dynamic> json) => Family(
    id: json['id'],
    name: json['name'],
    inviteCode: json['invite_code'],
    createdBy: json['created_by'],
    createdAt: DateTime.parse(json['created_at']),
  );

  Family copyWith({String? id, String? name, String? inviteCode, String? createdBy, DateTime? createdAt}) {
    return Family(
      id: id ?? this.id,
      name: name ?? this.name,
      inviteCode: inviteCode ?? this.inviteCode,
      createdBy: createdBy ?? this.createdBy,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  bool operator ==(Object other) => identical(this, other) || other is Family && runtimeType == other.runtimeType && id == other.id && name == other.name && inviteCode == other.inviteCode && createdBy == other.createdBy && createdAt == other.createdAt;

  @override
  int get hashCode => id.hashCode ^ name.hashCode ^ inviteCode.hashCode ^ createdBy.hashCode ^ createdAt.hashCode;
}

@immutable
class UserProfile {
  final String id;
  final String familyId;
  final String? authId;
  final String role;
  final String name;
  final String avatarEmoji;

  const UserProfile({required this.id, required this.familyId, this.authId, required this.role, required this.name, required this.avatarEmoji});

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
    id: json['id'],
    familyId: json['family_id'],
    authId: json['auth_id'],
    role: json['role'],
    name: json['name'],
    avatarEmoji: json['avatar_emoji'],
  );

  UserProfile copyWith({String? id, String? familyId, String? authId, String? role, String? name, String? avatarEmoji}) {
    return UserProfile(
      id: id ?? this.id,
      familyId: familyId ?? this.familyId,
      authId: authId ?? this.authId,
      role: role ?? this.role,
      name: name ?? this.name,
      avatarEmoji: avatarEmoji ?? this.avatarEmoji,
    );
  }

  @override
  bool operator ==(Object other) => identical(this, other) || other is UserProfile && runtimeType == other.runtimeType && id == other.id && familyId == other.familyId && authId == other.authId && role == other.role && name == other.name && avatarEmoji == other.avatarEmoji;

  @override
  int get hashCode => id.hashCode ^ familyId.hashCode ^ authId.hashCode ^ role.hashCode ^ name.hashCode ^ avatarEmoji.hashCode;
}

@immutable
class Chore {
  final String id;
  final String familyId;
  final String assignedToChildId;
  final String title;
  final double value;
  final String status;
  final String? dueDate;
  final bool isRecurring;
  final String? recurrencePeriod;

  const Chore({
    required this.id, required this.familyId, required this.assignedToChildId,
    required this.title, required this.value, required this.status,
    this.dueDate, required this.isRecurring, this.recurrencePeriod,
  });

  factory Chore.fromJson(Map<String, dynamic> json) => Chore(
    id: json['id'],
    familyId: json['family_id'],
    assignedToChildId: json['assigned_to_child_id'],
    title: json['title'],
    value: double.parse(json['value'].toString()),
    status: json['status'],
    dueDate: json['due_date'],
    isRecurring: json['is_recurring'] ?? false,
    recurrencePeriod: json['recurrence_period'],
  );

  Chore copyWith({
    String? id, String? familyId, String? assignedToChildId,
    String? title, double? value, String? status,
    String? dueDate, bool? isRecurring, String? recurrencePeriod,
  }) {
    return Chore(
      id: id ?? this.id,
      familyId: familyId ?? this.familyId,
      assignedToChildId: assignedToChildId ?? this.assignedToChildId,
      title: title ?? this.title,
      value: value ?? this.value,
      status: status ?? this.status,
      dueDate: dueDate ?? this.dueDate,
      isRecurring: isRecurring ?? this.isRecurring,
      recurrencePeriod: recurrencePeriod ?? this.recurrencePeriod,
    );
  }

  @override
  bool operator ==(Object other) => identical(this, other) || other is Chore && runtimeType == other.runtimeType && id == other.id && familyId == other.familyId && assignedToChildId == other.assignedToChildId && title == other.title && value == other.value && status == other.status && dueDate == other.dueDate && isRecurring == other.isRecurring && recurrencePeriod == other.recurrencePeriod;

  @override
  int get hashCode => id.hashCode ^ familyId.hashCode ^ assignedToChildId.hashCode ^ title.hashCode ^ value.hashCode ^ status.hashCode ^ dueDate.hashCode ^ isRecurring.hashCode ^ recurrencePeriod.hashCode;
}

@immutable
class BucketTemplate {
  final String id;
  final String familyId;
  final String name;
  final String emoji;
  final String color;
  final Color parsedColor;

  const BucketTemplate({required this.id, required this.familyId, required this.name, required this.emoji, required this.color, required this.parsedColor});

  factory BucketTemplate.fromJson(Map<String, dynamic> json) {
    final colorStr = json['color'] as String;
    Color parsed;
    try {
      parsed = Color(int.parse(colorStr.replaceFirst('#', '0xFF')));
    } catch (_) {
      parsed = const Color(0xFF2B9EB3); // fallback to teal
    }
    return BucketTemplate(
      id: json['id'],
      familyId: json['family_id'],
      name: json['name'],
      emoji: json['emoji'],
      color: colorStr,
      parsedColor: parsed,
    );
  }

  BucketTemplate copyWith({String? id, String? familyId, String? name, String? emoji, String? color, Color? parsedColor}) {
    return BucketTemplate(
      id: id ?? this.id,
      familyId: familyId ?? this.familyId,
      name: name ?? this.name,
      emoji: emoji ?? this.emoji,
      color: color ?? this.color,
      parsedColor: parsedColor ?? this.parsedColor,
    );
  }

  @override
  bool operator ==(Object other) => identical(this, other) || other is BucketTemplate && runtimeType == other.runtimeType && id == other.id && familyId == other.familyId && name == other.name && emoji == other.emoji && color == other.color && parsedColor == other.parsedColor;

  @override
  int get hashCode => id.hashCode ^ familyId.hashCode ^ name.hashCode ^ emoji.hashCode ^ color.hashCode ^ parsedColor.hashCode;
}

@immutable
class Bucket {
  final String id;
  final String childId;
  final String templateId;
  final int month;
  final int year;
  final double cachedBalance;

  const Bucket({
    required this.id, required this.childId, required this.templateId,
    required this.month, required this.year, required this.cachedBalance,
  });

  factory Bucket.fromJson(Map<String, dynamic> json) => Bucket(
    id: json['id'],
    childId: json['child_id'],
    templateId: json['template_id'],
    month: json['month'],
    year: json['year'],
    cachedBalance: double.parse(json['cached_balance'].toString()),
  );

  Bucket copyWith({
    String? id, String? childId, String? templateId,
    int? month, int? year, double? cachedBalance,
  }) {
    return Bucket(
      id: id ?? this.id,
      childId: childId ?? this.childId,
      templateId: templateId ?? this.templateId,
      month: month ?? this.month,
      year: year ?? this.year,
      cachedBalance: cachedBalance ?? this.cachedBalance,
    );
  }

  @override
  bool operator ==(Object other) => identical(this, other) || other is Bucket && runtimeType == other.runtimeType && id == other.id && childId == other.childId && templateId == other.templateId && month == other.month && year == other.year && cachedBalance == other.cachedBalance;

  @override
  int get hashCode => id.hashCode ^ childId.hashCode ^ templateId.hashCode ^ month.hashCode ^ year.hashCode ^ cachedBalance.hashCode;
}

@immutable
class Transaction {
  final String id;
  final String bucketId;
  final String? childId;
  final double amount;
  final String type;
  final String? description;
  final String status;
  final String createdAt;

  const Transaction({
    required this.id, required this.bucketId, this.childId,
    required this.amount, required this.type, this.description,
    required this.status, required this.createdAt,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) => Transaction(
    id: json['id'],
    bucketId: json['bucket_id'],
    childId: json['child_id'],
    amount: double.parse(json['amount'].toString()),
    type: json['type'],
    description: json['description'],
    status: json['status'] ?? 'completed',
    createdAt: json['created_at'],
  );

  Transaction copyWith({
    String? id, String? bucketId, String? childId,
    double? amount, String? type, String? description,
    String? status, String? createdAt,
  }) {
    return Transaction(
      id: id ?? this.id,
      bucketId: bucketId ?? this.bucketId,
      childId: childId ?? this.childId,
      amount: amount ?? this.amount,
      type: type ?? this.type,
      description: description ?? this.description,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  bool operator ==(Object other) => identical(this, other) || other is Transaction && runtimeType == other.runtimeType && id == other.id && bucketId == other.bucketId && childId == other.childId && amount == other.amount && type == other.type && description == other.description && status == other.status && createdAt == other.createdAt;

  @override
  int get hashCode => id.hashCode ^ bucketId.hashCode ^ childId.hashCode ^ amount.hashCode ^ type.hashCode ^ description.hashCode ^ status.hashCode ^ createdAt.hashCode;
}

@immutable
class InterestSetting {
  final String id;
  final String templateId;
  final double ratePercent;
  final bool matchEnabled;

  const InterestSetting({
    required this.id, required this.templateId, required this.ratePercent, required this.matchEnabled,
  });

  factory InterestSetting.fromJson(Map<String, dynamic> json) {
    return InterestSetting(
      id: json['id'] as String,
      templateId: json['template_id'] as String,
      ratePercent: (json['rate_percent'] as num).toDouble(),
      matchEnabled: json['match_enabled'] as bool,
    );
  }

  InterestSetting copyWith({
    String? id, String? templateId, double? ratePercent, bool? matchEnabled,
  }) {
    return InterestSetting(
      id: id ?? this.id,
      templateId: templateId ?? this.templateId,
      ratePercent: ratePercent ?? this.ratePercent,
      matchEnabled: matchEnabled ?? this.matchEnabled,
    );
  }

  @override
  bool operator ==(Object other) => identical(this, other) || other is InterestSetting && runtimeType == other.runtimeType && id == other.id && templateId == other.templateId && ratePercent == other.ratePercent && matchEnabled == other.matchEnabled;

  @override
  int get hashCode => id.hashCode ^ templateId.hashCode ^ ratePercent.hashCode ^ matchEnabled.hashCode;
}

@immutable
class GoogleTaskMapping {
  final String id;
  final String familyId;
  final String googleTasklistId;
  final String googleTasklistTitle;
  final String childId;
  final double defaultReward;
  final String? lastSyncedAt;

  const GoogleTaskMapping({
    required this.id,
    required this.familyId,
    required this.googleTasklistId,
    required this.googleTasklistTitle,
    required this.childId,
    required this.defaultReward,
    this.lastSyncedAt,
  });

  factory GoogleTaskMapping.fromJson(Map<String, dynamic> json) {
    return GoogleTaskMapping(
      id: json['id'] as String,
      familyId: json['family_id'] as String,
      googleTasklistId: json['google_tasklist_id'] as String,
      googleTasklistTitle: json['google_tasklist_title'] as String,
      childId: json['child_id'] as String,
      defaultReward: (json['default_reward'] as num).toDouble(),
      lastSyncedAt: json['last_synced_at'] as String?,
    );
  }

  GoogleTaskMapping copyWith({
    String? id, String? familyId, String? googleTasklistId,
    String? googleTasklistTitle, String? childId, double? defaultReward,
    String? lastSyncedAt,
  }) {
    return GoogleTaskMapping(
      id: id ?? this.id,
      familyId: familyId ?? this.familyId,
      googleTasklistId: googleTasklistId ?? this.googleTasklistId,
      googleTasklistTitle: googleTasklistTitle ?? this.googleTasklistTitle,
      childId: childId ?? this.childId,
      defaultReward: defaultReward ?? this.defaultReward,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
    );
  }

  @override
  bool operator ==(Object other) => identical(this, other) || other is GoogleTaskMapping && runtimeType == other.runtimeType && id == other.id && familyId == other.familyId && googleTasklistId == other.googleTasklistId && googleTasklistTitle == other.googleTasklistTitle && childId == other.childId && defaultReward == other.defaultReward && lastSyncedAt == other.lastSyncedAt;

  @override
  int get hashCode => id.hashCode ^ familyId.hashCode ^ googleTasklistId.hashCode ^ googleTasklistTitle.hashCode ^ childId.hashCode ^ defaultReward.hashCode ^ lastSyncedAt.hashCode;
}
