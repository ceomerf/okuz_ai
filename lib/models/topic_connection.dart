/// Konular arasındaki bağlantıları temsil eden sınıf
class TopicConnection {
  final String id;
  final String subject; // Ders adı
  final String topic; // Ana konu
  final List<String> prerequisites; // Öncül konular
  final List<String> followups; // Ardıl konular
  final List<String> relatedTopics; // İlişkili konular
  final Map<String, double> topicImportance; // Konu önemi (0-1 arası)
  final String description; // Bağlantı açıklaması

  TopicConnection({
    required this.id,
    required this.subject,
    required this.topic,
    required this.prerequisites,
    required this.followups,
    required this.relatedTopics,
    required this.topicImportance,
    required this.description,
  });

  factory TopicConnection.fromJson(Map<String, dynamic> json) {
    return TopicConnection(
      id: json['id'] ?? '',
      subject: json['subject'] ?? '',
      topic: json['topic'] ?? '',
      prerequisites: List<String>.from(json['prerequisites'] ?? []),
      followups: List<String>.from(json['followups'] ?? []),
      relatedTopics: List<String>.from(json['relatedTopics'] ?? []),
      topicImportance: Map<String, double>.from(json['topicImportance'] ?? {}),
      description: json['description'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'subject': subject,
      'topic': topic,
      'prerequisites': prerequisites,
      'followups': followups,
      'relatedTopics': relatedTopics,
      'topicImportance': topicImportance,
      'description': description,
    };
  }
}

/// Konu haritası için düğüm sınıfı
class TopicNode {
  final String id;
  final String topic;
  final String subject;
  final String description;
  final double importance; // 0-1 arası
  final String status; // 'not_started', 'in_progress', 'completed'
  final double mastery; // 0-1 arası
  final List<String> connectedTopics; // Bağlantılı konuların ID'leri

  TopicNode({
    required this.id,
    required this.topic,
    required this.subject,
    required this.description,
    required this.importance,
    required this.status,
    required this.mastery,
    required this.connectedTopics,
  });

  factory TopicNode.fromJson(Map<String, dynamic> json) {
    return TopicNode(
      id: json['id'] ?? '',
      topic: json['topic'] ?? '',
      subject: json['subject'] ?? '',
      description: json['description'] ?? '',
      importance: (json['importance'] ?? 0.5).toDouble(),
      status: json['status'] ?? 'not_started',
      mastery: (json['mastery'] ?? 0.0).toDouble(),
      connectedTopics: List<String>.from(json['connectedTopics'] ?? []),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'topic': topic,
      'subject': subject,
      'description': description,
      'importance': importance,
      'status': status,
      'mastery': mastery,
      'connectedTopics': connectedTopics,
    };
  }
}

/// Konu haritası için kenar sınıfı
class TopicEdge {
  final String id;
  final String sourceId; // Kaynak konu ID'si
  final String targetId; // Hedef konu ID'si
  final String relationshipType; // 'prerequisite', 'followup', 'related'
  final double strength; // Bağlantı gücü (0-1 arası)
  final String description; // Bağlantı açıklaması

  TopicEdge({
    required this.id,
    required this.sourceId,
    required this.targetId,
    required this.relationshipType,
    required this.strength,
    required this.description,
  });

  factory TopicEdge.fromJson(Map<String, dynamic> json) {
    return TopicEdge(
      id: json['id'] ?? '',
      sourceId: json['sourceId'] ?? '',
      targetId: json['targetId'] ?? '',
      relationshipType: json['relationshipType'] ?? 'related',
      strength: (json['strength'] ?? 0.5).toDouble(),
      description: json['description'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'sourceId': sourceId,
      'targetId': targetId,
      'relationshipType': relationshipType,
      'strength': strength,
      'description': description,
    };
  }
}

/// Tam konu haritası sınıfı
class TopicMap {
  final String id;
  final String subject;
  final String grade;
  final String userId;
  final List<TopicNode> nodes;
  final List<TopicEdge> edges;
  final DateTime createdAt;
  final DateTime updatedAt;

  TopicMap({
    required this.id,
    required this.subject,
    required this.grade,
    required this.userId,
    required this.nodes,
    required this.edges,
    required this.createdAt,
    required this.updatedAt,
  });

  factory TopicMap.fromJson(Map<String, dynamic> json) {
    return TopicMap(
      id: json['id'] ?? '',
      subject: json['subject'] ?? '',
      grade: json['grade'] ?? '',
      userId: json['userId'] ?? '',
      nodes: (json['nodes'] as List?)
              ?.map((e) => TopicNode.fromJson(e))
              .toList() ??
          [],
      edges: (json['edges'] as List?)
              ?.map((e) => TopicEdge.fromJson(e))
              .toList() ??
          [],
      createdAt: json['createdAt']?.toDate() ?? DateTime.now(),
      updatedAt: json['updatedAt']?.toDate() ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'subject': subject,
      'grade': grade,
      'userId': userId,
      'nodes': nodes.map((e) => e.toJson()).toList(),
      'edges': edges.map((e) => e.toJson()).toList(),
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
} 