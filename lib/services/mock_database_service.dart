import '../models/student_profile.dart';
import '../models/long_term_plan.dart';
import 'dart:math';

class MockDatabaseService {
  static final MockDatabaseService _instance = MockDatabaseService._internal();
  factory MockDatabaseService() => _instance;
  MockDatabaseService._internal() {
    _initializeMockData();
  }

  static MockDatabaseService get instance => _instance;

  List<StudentProfile> _studentProfiles = [];
  List<LongTermPlan> _plans = [];
  final Random _random = Random();

  void _initializeMockData() {
    final subjects = ['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Türkçe', 'Tarih', 'Coğrafya', 'Felsefe'];
    final names = ['Ali Yılmaz', 'Ayşe Demir', 'Mehmet Kaya', 'Fatma Özkan', 'Ahmet Çelik'];
    
    _studentProfiles = [
      StudentProfile(
          id: 'student1',
          profileName: names[_random.nextInt(names.length)],
          studentName: names[_random.nextInt(names.length)],
          lastActive: DateTime.now().subtract(Duration(hours: _random.nextInt(24))),
      ),
      StudentProfile(
          id: 'student2',
          profileName: names[_random.nextInt(names.length)],
          studentName: names[_random.nextInt(names.length)],
          lastActive: DateTime.now().subtract(Duration(hours: _random.nextInt(48))),
      ),
    ];
    
    _plans = [
      LongTermPlan(
          id: 'plan1',
          title: '${subjects[_random.nextInt(subjects.length)]} Haftalık Planı',
          description: 'Bu hafta ${subjects[_random.nextInt(subjects.length)]} çalışacağım',
          startDate: DateTime.now(),
          endDate: DateTime.now().add(Duration(days: 7)),
          goals: ['${subjects[_random.nextInt(subjects.length)]} testi çöz', 'Konuları tekrar et']),
      LongTermPlan(
          id: 'plan2',
          title: '${subjects[_random.nextInt(subjects.length)]} Aylık Planı',
          description: 'Bu ay ${subjects[_random.nextInt(subjects.length)]} konularını tamamlayacağım',
          startDate: DateTime.now(),
          endDate: DateTime.now().add(Duration(days: 30)),
          goals: ['Tüm konuları öğren', 'Test çöz', 'Eksikleri gider']),
    ];
  }

  Future<List<StudentProfile>> getStudentProfiles() async {
    return _studentProfiles;
  }

  Future<void> addStudent(StudentProfile student) async {
    _studentProfiles.add(student);
  }

  Future<List<LongTermPlan>> getPlans() async {
    return _plans;
  }

  Future<void> addPlan(LongTermPlan plan) async {
    _plans.add(plan);
  }

  // Çalışma oturumu kaydet
  Future<void> logStudySession({
    required String subject,
    required String topic,
    required int durationInMinutes,
    required DateTime startTime,
    required DateTime endTime,
    String? notes,
    Map<String, dynamic>? performanceData,
  }) async {
    print(
        'Study session logged: $subject - $topic for $durationInMinutes minutes');
    // Mock implementation - gerçek uygulamada veritabanına kaydedilir
  }

  Future<dynamic> callCloudFunction(
      String name, Map<String, dynamic> params) async {
    // Mock implementation for a cloud function call
    print('Cloud function called: $name with params: $params');
    // Return a mock response based on the function name
    if (name == 'getRecommendations') {
      return {
        'recommendations': ['Math', 'Physics']
      };
    }
    return {'status': 'success', 'data': 'mock data'};
  }

  Future<String> uploadImage(dynamic file) async {
    // Mock implementation for image upload
    print('Image upload called with file: $file');
    return 'https://picsum.photos/200';
  }
}
