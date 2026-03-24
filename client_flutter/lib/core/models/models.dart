class Family {
  final String id;
  final String name;
  final String inviteCode;
  final String createdBy;
  final DateTime createdAt;

  Family({required this.id, required this.name, required this.inviteCode, required this.createdBy, required this.createdAt});

  factory Family.fromJson(Map<String, dynamic> json) => Family(
    id: json['id'],
    name: json['name'],
    inviteCode: json['invite_code'],
    createdBy: json['created_by'],
    createdAt: DateTime.parse(json['created_at']),
  );
}

class UserProfile {
  final String id;
  final String familyId;
  final String? authId;
  final String role;
  final String name;
  final String avatarEmoji;

  UserProfile({required this.id, required this.familyId, this.authId, required this.role, required this.name, required this.avatarEmoji});

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
    id: json['id'],
    familyId: json['family_id'],
    authId: json['auth_id'],
    role: json['role'],
    name: json['name'],
    avatarEmoji: json['avatar_emoji'],
  );
}

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

  Chore({
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
}

class BucketTemplate {
  final String id;
  final String familyId;
  final String name;
  final String emoji;
  final String color;

  BucketTemplate({required this.id, required this.familyId, required this.name, required this.emoji, required this.color});

  factory BucketTemplate.fromJson(Map<String, dynamic> json) => BucketTemplate(
    id: json['id'],
    familyId: json['family_id'],
    name: json['name'],
    emoji: json['emoji'],
    color: json['color'],
  );
}

class Bucket {
  final String id;
  final String childId;
  final String templateId;
  final int month;
  final int year;
  final double cachedBalance;

  Bucket({
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
}

class Transaction {
  final String id;
  final String bucketId;
  final String? childId;
  final double amount;
  final String type;
  final String? description;
  final String status;
  final String createdAt;

  Transaction({
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
}

class InterestSetting {
  final String id;
  final String templateId;
  final double ratePercent;
  final bool matchEnabled;

  InterestSetting({
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
}

class GoogleTaskMapping {
  final String id;
  final String familyId;
  final String googleTasklistId;
  final String googleTasklistTitle;
  final String childId;
  final double defaultReward;
  final String? lastSyncedAt;

  GoogleTaskMapping({
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
}
