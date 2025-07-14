import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_functions/firebase_functions.dart';
import 'dart:convert';

class SmartToolsScreen extends StatefulWidget {
  const SmartToolsScreen({Key? key}) : super(key: key);

  @override
  State<SmartToolsScreen> createState() => _SmartToolsScreenState();
}

class _SmartToolsScreenState extends State<SmartToolsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _summaryTextController = TextEditingController();
  final TextEditingController _summaryUrlController = TextEditingController();
  final TextEditingController _conceptMapSubjectController = TextEditingController();
  final TextEditingController _conceptMapTopicController = TextEditingController();
  
  bool _isGeneratingSummary = false;
  bool _isGeneratingConceptMap = false;
  String _summaryResult = '';
  Map<String, dynamic>? _conceptMapResult;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _summaryTextController.dispose();
    _summaryUrlController.dispose();
    _conceptMapSubjectController.dispose();
    _conceptMapTopicController.dispose();
    super.dispose();
  }

  Future<void> _generateSummary() async {
    final text = _summaryTextController.text.trim();
    final url = _summaryUrlController.text.trim();
    
    if (text.isEmpty && url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lütfen metin veya URL girin')),
      );
      return;
    }
    
    setState(() {
      _isGeneratingSummary = true;
      _summaryResult = '';
    });
    
    try {
      final callable = FirebaseFunctions.instance.httpsCallable('generateSummary');
      final result = await callable.call({
        'text': text,
        'url': url,
      });
      
      setState(() {
        _summaryResult = result.data['summary'] ?? 'Özet oluşturulamadı';
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Özet oluşturulurken hata: $e')),
      );
    } finally {
      setState(() {
        _isGeneratingSummary = false;
      });
    }
  }

  Future<void> _generateConceptMap() async {
    final subject = _conceptMapSubjectController.text.trim();
    final topic = _conceptMapTopicController.text.trim();
    
    if (subject.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lütfen en az ders adını girin')),
      );
      return;
    }
    
    setState(() {
      _isGeneratingConceptMap = true;
      _conceptMapResult = null;
    });
    
    try {
      final callable = FirebaseFunctions.instance.httpsCallable('generateConceptMap');
      final result = await callable.call({
        'subject': subject,
        'topic': topic.isNotEmpty ? topic : null,
      });
      
      setState(() {
        _conceptMapResult = result.data;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Kavram haritası oluşturulurken hata: $e')),
      );
    } finally {
      setState(() {
        _isGeneratingConceptMap = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Akıllı Araçlar'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Özet Oluşturucu'),
            Tab(text: 'Kavram Haritası'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildSummaryTab(),
          _buildConceptMapTab(),
        ],
      ),
    );
  }

  Widget _buildSummaryTab() {
    final theme = Theme.of(context);
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'YKS Formatında Özet Oluşturucu',
            style: theme.textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            'Metin veya web sayfası URL\'si girerek YKS formatında özet oluşturun.',
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: 24),
          
          // URL Girişi
          TextField(
            controller: _summaryUrlController,
            decoration: InputDecoration(
              labelText: 'Web Sayfası URL',
              hintText: 'https://tr.wikipedia.org/wiki/Türev',
              prefixIcon: const Icon(Icons.link),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            keyboardType: TextInputType.url,
          ),
          
          const SizedBox(height: 16),
          const Text('VEYA'),
          const SizedBox(height: 16),
          
          // Metin Girişi
          TextField(
            controller: _summaryTextController,
            decoration: InputDecoration(
              labelText: 'Metin',
              hintText: 'Özetlemek istediğiniz metni buraya yapıştırın...',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            maxLines: 5,
            textInputAction: TextInputAction.newline,
          ),
          
          const SizedBox(height: 24),
          
          Center(
            child: ElevatedButton.icon(
              onPressed: _isGeneratingSummary ? null : _generateSummary,
              icon: _isGeneratingSummary
                  ? Container(
                      width: 24,
                      height: 24,
                      padding: const EdgeInsets.all(2.0),
                      child: const CircularProgressIndicator(
                        strokeWidth: 3,
                      ),
                    )
                  : const Icon(Icons.auto_awesome),
              label: Text(_isGeneratingSummary ? 'Oluşturuluyor...' : 'Özet Oluştur'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
            ),
          ),
          
          const SizedBox(height: 24),
          
          if (_summaryResult.isNotEmpty)
            Card(
              elevation: 4,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Oluşturulan Özet',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.copy),
                          onPressed: () {
                            // Panoya kopyala
                          },
                          tooltip: 'Kopyala',
                        ),
                      ],
                    ),
                    const Divider(),
                    const SizedBox(height: 8),
                    Text(_summaryResult),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildConceptMapTab() {
    final theme = Theme.of(context);
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Kavram Haritası Oluşturucu',
            style: theme.textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            'Ders ve konu bilgisi girerek görsel kavram haritası oluşturun.',
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: 24),
          
          // Ders Girişi
          TextField(
            controller: _conceptMapSubjectController,
            decoration: InputDecoration(
              labelText: 'Ders',
              hintText: 'Örn: Matematik, Fizik, Kimya...',
              prefixIcon: const Icon(Icons.book),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Konu Girişi
          TextField(
            controller: _conceptMapTopicController,
            decoration: InputDecoration(
              labelText: 'Konu (İsteğe Bağlı)',
              hintText: 'Örn: Türev, Asitler ve Bazlar...',
              prefixIcon: const Icon(Icons.topic),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          
          const SizedBox(height: 24),
          
          Center(
            child: ElevatedButton.icon(
              onPressed: _isGeneratingConceptMap ? null : _generateConceptMap,
              icon: _isGeneratingConceptMap
                  ? Container(
                      width: 24,
                      height: 24,
                      padding: const EdgeInsets.all(2.0),
                      child: const CircularProgressIndicator(
                        strokeWidth: 3,
                      ),
                    )
                  : const Icon(Icons.account_tree),
              label: Text(_isGeneratingConceptMap ? 'Oluşturuluyor...' : 'Kavram Haritası Oluştur'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
            ),
          ),
          
          const SizedBox(height: 24),
          
          if (_conceptMapResult != null)
            Card(
              elevation: 4,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Kavram Haritası',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.save_alt),
                          onPressed: () {
                            // Kaydet
                          },
                          tooltip: 'Kaydet',
                        ),
                      ],
                    ),
                    const Divider(),
                    const SizedBox(height: 16),
                    // Burada kavram haritası görselleştirilecek
                    // Örnek olarak basit bir temsil gösteriyoruz
                    _buildConceptMapVisualization(_conceptMapResult!),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildConceptMapVisualization(Map<String, dynamic> conceptMap) {
    // Bu fonksiyon, gerçek bir kavram haritası görselleştirmesi için
    // daha karmaşık bir widget ile değiştirilmelidir.
    // Şimdilik basit bir temsil gösteriyoruz.
    
    final nodes = conceptMap['nodes'] as List<dynamic>? ?? [];
    final edges = conceptMap['edges'] as List<dynamic>? ?? [];
    
    return Column(
      children: [
        Text('${nodes.length} kavram ve ${edges.length} bağlantı içeren harita oluşturuldu.'),
        const SizedBox(height: 16),
        Container(
          height: 300,
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.grey.shade200,
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Center(
            child: Text(
              'Kavram haritası görselleştirmesi burada gösterilecek.\n'
              'Bu özellik yakında eklenecektir.',
              textAlign: TextAlign.center,
            ),
          ),
        ),
        const SizedBox(height: 16),
        ExpansionTile(
          title: const Text('Kavram Listesi'),
          children: [
            if (nodes.isEmpty)
              const Padding(
                padding: EdgeInsets.all(16.0),
                child: Text('Kavram bulunamadı.'),
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: nodes.length > 5 ? 5 : nodes.length,
                itemBuilder: (context, index) {
                  final node = nodes[index] as Map<String, dynamic>;
                  return ListTile(
                    title: Text(node['topic'] as String? ?? 'Bilinmeyen Kavram'),
                    subtitle: Text(node['description'] as String? ?? ''),
                  );
                },
              ),
            if (nodes.length > 5)
              Padding(
                padding: const EdgeInsets.all(8.0),
                child: Text('... ve ${nodes.length - 5} kavram daha'),
              ),
          ],
        ),
      ],
    );
  }
} 