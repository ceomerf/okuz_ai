import 'account_type.dart';

class UserAccount {
  final String id;
  final String uid; // Firebase'den kalma uid alanı
  final String email;
  final String fullName;
  final AccountType accountType;

  UserAccount({
    required this.id,
    required this.uid,
    required this.email,
    required this.fullName,
    this.accountType = AccountType.unknown,
  });

  factory UserAccount.fromJson(Map<String, dynamic> json) {
    return UserAccount(
      id: json['id'] ?? '',
      uid: json['uid'] ?? json['id'] ?? '', // uid yoksa id'yi kullan
      email: json['email'] ?? '',
      fullName: json['fullName'] ?? '',
      accountType: AccountType.values.firstWhere(
        (e) => e.name == json['accountType'],
        orElse: () => AccountType.unknown,
      ),
    );
  }

  factory UserAccount.fromMap(Map<String, dynamic> map) {
    return UserAccount.fromJson(map);
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'uid': uid,
      'email': email,
      'fullName': fullName,
      'accountType': accountType.name,
    };
  }

  // Mock studentProfiles getter for family portal
  List<dynamic> get studentProfiles => [];
}
