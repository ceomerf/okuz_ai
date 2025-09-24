class LearningPath {
  final String pathTitle;
  final String totalEstimatedTime;
  final List<Milestone> milestones;

  LearningPath({
    required this.pathTitle,
    required this.totalEstimatedTime,
    required this.milestones,
  });

  factory LearningPath.fromJson(Map<String, dynamic> json) {
    print('🔍 LearningPath.fromJson: $json');
    
    // Backend'den gelen veri yapısına uygun parsing
    final topic = json['topic'] ?? '';
    final level = json['level'] ?? '';
    final steps = json['steps'] as List? ?? [];
    final milestones = json['milestones'] as List? ?? [];
    
    // Toplam süreyi hesapla
    int totalMinutes = 0;
    for (var step in steps) {
      final estimatedTime = step['estimatedTime'] ?? '';
      if (estimatedTime.contains('dakika')) {
        final minutes = int.tryParse(estimatedTime.replaceAll(' dakika', '')) ?? 0;
        totalMinutes += minutes;
      }
    }
    
    return LearningPath(
      pathTitle: '$topic - $level Seviye',
      totalEstimatedTime: '$totalMinutes dakika',
      milestones: milestones.map((e) => Milestone.fromJson(e)).toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        'pathTitle': pathTitle,
        'totalEstimatedTime': totalEstimatedTime,
        'milestones': milestones.map((e) => e.toJson()).toList(),
      };
}

class Milestone {
  final String milestoneTitle;
  final String milestoneWeek;
  final String milestoneGoal;
  final List<PathStep> steps;

  Milestone({
    required this.milestoneTitle,
    required this.milestoneWeek,
    required this.milestoneGoal,
    required this.steps,
  });

  factory Milestone.fromJson(Map<String, dynamic> json) {
    print('🔍 Milestone.fromJson: $json');
    
    // Backend'den gelen veri yapısına uygun parsing
    return Milestone(
      milestoneTitle: json['milestone'] ?? '',
      milestoneWeek: '1. Hafta', // Varsayılan değer
      milestoneGoal: json['description'] ?? '',
      steps: (json['criteria'] as List? ?? [])
          .map((e) => PathStep.fromJson({'stepTitle': e.toString()}))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        'milestoneTitle': milestoneTitle,
        'milestoneWeek': milestoneWeek,
        'milestoneGoal': milestoneGoal,
        'steps': steps.map((e) => e.toJson()).toList(),
      };
}

class PathStep {
  final String stepTitle;
  final String stepDescription;
  final String resourceType;
  final ResourceDetails resourceDetails;
  final String estimatedTime;

  PathStep({
    required this.stepTitle,
    required this.stepDescription,
    required this.resourceType,
    required this.resourceDetails,
    required this.estimatedTime,
  });

  factory PathStep.fromJson(Map<String, dynamic> json) {
    return PathStep(
      stepTitle: json['stepTitle'] ?? '',
      stepDescription: json['stepDescription'] ?? '',
      resourceType: json['resourceType'] ?? '',
      resourceDetails: ResourceDetails.fromJson(json['resourceDetails'] ?? {}),
      estimatedTime: json['estimatedTime'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'stepTitle': stepTitle,
        'stepDescription': stepDescription,
        'resourceType': resourceType,
        'resourceDetails': resourceDetails.toJson(),
        'estimatedTime': estimatedTime,
      };
}

class ResourceDetails {
  final String sourceName;
  final String url;
  final String timestamp;

  ResourceDetails({
    required this.sourceName,
    required this.url,
    required this.timestamp,
  });

  factory ResourceDetails.fromJson(Map<String, dynamic> json) {
    return ResourceDetails(
      sourceName: json['sourceName'] ?? '',
      url: json['url'] ?? '',
      timestamp: json['timestamp'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'sourceName': sourceName,
        'url': url,
        'timestamp': timestamp,
      };
}

class PathHistory {
  final String id;
  final String goal;
  final DateTime createdAt;

  PathHistory({
    required this.id,
    required this.goal,
    required this.createdAt,
  });

  factory PathHistory.fromJson(Map<String, dynamic> json) {
    return PathHistory(
      id: json['id'] ?? '',
      goal: json['goal'] ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
    );
  }
} 