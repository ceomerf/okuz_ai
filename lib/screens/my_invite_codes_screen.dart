import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:okuz_ai/services/providers.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_client.dart';
import '../theme/app_theme.dart';
import 'package:intl/intl.dart';

class MyInviteCodesScreen extends ConsumerStatefulWidget {
  const MyInviteCodesScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<MyInviteCodesScreen> createState() => _MyInviteCodesScreenState();
}

class _MyInviteCodesScreenState extends ConsumerState<MyInviteCodesScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  Map<String, dynamic>? _codesData;
  List<Map<String, dynamic>> _codes = [];
  Map<String, dynamic>? _summary;

  @override
  void initState() {
    super.initState();
    _loadInviteCodes();
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Davet Kodlarım',
          style: GoogleFonts.figtree(fontWeight: FontWeight.w600),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            onPressed: _loadInviteCodes,
            icon: const Icon(Icons.refresh),
            tooltip: 'Yenile',
          ),
        ],
      ),
      floatingActionButton: _summary?['canCreateMore'] == true
          ? FloatingActionButton.extended(
              onPressed: _createNewInviteCode,
              backgroundColor: AppTheme.primaryColor,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add),
              label: Text(
                'Yeni Kod',
                style: GoogleFonts.figtree(fontWeight: FontWeight.w600),
              ),
            )
          : null,
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _buildContent(),
    );
  }

  Widget _buildContent() {
    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              'Hata Oluştu',
              style: GoogleFonts.figtree(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: GoogleFonts.figtree(
                  color: Colors.grey[600],
                ),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _loadInviteCodes,
              child: const Text('Tekrar Dene'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadInviteCodes,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Özet kartı
            if (_summary != null) _buildSummaryCard(),
            const SizedBox(height: 24),

            // Kod listesi başlığı
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Davet Kodlarım',
                  style: GoogleFonts.figtree(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (_codes.isNotEmpty)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${_codes.length} Kod',
                      style: GoogleFonts.figtree(
                        color: AppTheme.primaryColor,
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 16),

            // Kodlar listesi
            if (_codes.isEmpty)
              _buildEmptyState()
            else
              ..._codes.map((code) => _buildCodeCard(code)).toList(),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryCard() {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final summary = _summary!;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.primaryColor.withOpacity(0.1),
            AppTheme.accentColor.withOpacity(0.1),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppTheme.primaryColor.withOpacity(0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.family_restroom,
                color: AppTheme.primaryColor,
                size: 24,
              ),
              const SizedBox(width: 12),
              Text(
                'Veli Bağlantı Durumu',
                style: GoogleFonts.figtree(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: isDarkMode ? Colors.white : AppTheme.primaryColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildSummaryItem(
                  'Bağlı Veli',
                  '${summary['activeParentCount']}/${summary['maxParentLimit'] ?? 2}',
                  Colors.green,
                  Icons.people,
                ),
              ),
              Expanded(
                child: _buildSummaryItem(
                  'Kalan Slot',
                  '${summary['remainingParentSlots'] ?? 0}',
                  Colors.blue,
                  Icons.person_add,
                ),
              ),
              Expanded(
                child: _buildSummaryItem(
                  'Aktif Kod',
                  '${summary['active']}',
                  Colors.orange,
                  Icons.qr_code,
                ),
              ),
              Expanded(
                child: _buildSummaryItem(
                  'Toplam Kod',
                  '${summary['total']}',
                  Colors.purple,
                  Icons.history,
                ),
              ),
            ],
          ),
          if (!(summary['canCreateMore'] ?? false)) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.orange.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.orange.shade600),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Maksimum 2 veli bağlantısı limitine ulaştınız',
                      style: GoogleFonts.figtree(
                        color: Colors.orange.shade700,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSummaryItem(
      String label, String value, Color color, IconData icon) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: GoogleFonts.figtree(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: GoogleFonts.figtree(
            fontSize: 12,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Widget _buildCodeCard(Map<String, dynamic> code) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final status = code['status'] as String;
    final isActive = status == 'ACTIVE';
    final isUsed = status == 'USED';
    final isExpired = status == 'EXPIRED';

    Color statusColor;
    Color backgroundColor;
    IconData statusIcon;
    String statusText;

    if (isActive) {
      statusColor = Colors.green;
      backgroundColor = Colors.green.withOpacity(0.1);
      statusIcon = Icons.check_circle;
      statusText = 'Aktif';
    } else if (isUsed) {
      statusColor = Colors.blue;
      backgroundColor = Colors.blue.withOpacity(0.1);
      statusIcon = Icons.person_add;
      statusText = 'Kullanıldı';
    } else {
      statusColor = Colors.red;
      backgroundColor = Colors.red.withOpacity(0.1);
      statusIcon = Icons.timer_off;
      statusText = 'Süresi Doldu';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isDarkMode ? const Color(0xFF1A1A1A) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: statusColor.withOpacity(0.3),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDarkMode ? 0.3 : 0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Üst kısım: Kod ve durum
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Kod
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: isDarkMode ? Colors.grey[800] : Colors.grey[100],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isDarkMode ? Colors.grey[600]! : Colors.grey[300]!,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        code['code'],
                        style: GoogleFonts.jetBrainsMono(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primaryColor,
                          letterSpacing: 2,
                        ),
                      ),
                      if (isActive) ...[
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTap: () => _copyToClipboard(code['code']),
                          child: Icon(
                            Icons.copy,
                            size: 16,
                            color: AppTheme.primaryColor,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                // Durum
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: backgroundColor,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(statusIcon, size: 14, color: statusColor),
                      const SizedBox(width: 4),
                      Text(
                        statusText,
                        style: GoogleFonts.figtree(
                          color: statusColor,
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Alt kısım: Detaylar
            Row(
              children: [
                Icon(
                  Icons.schedule,
                  size: 16,
                  color: Colors.grey[600],
                ),
                const SizedBox(width: 6),
                Text(
                  'Oluşturulma: ${_formatDate(code['createdAt'])}',
                  style: GoogleFonts.figtree(
                    color: Colors.grey[600],
                    fontSize: 12,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),

            if (isActive) ...[
              Row(
                children: [
                  Icon(
                    Icons.timer,
                    size: 16,
                    color: Colors.orange[600],
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Kalan süre: ${code['timeRemainingText']}',
                    style: GoogleFonts.figtree(
                      color: Colors.orange[600],
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ],

            if (isUsed && code['usedByUser'] != null) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(
                    Icons.person,
                    size: 16,
                    color: Colors.blue[600],
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Kullanan: ${code['usedByUser']['name']}',
                    style: GoogleFonts.figtree(
                      color: Colors.blue[600],
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  Icon(
                    Icons.access_time,
                    size: 16,
                    color: Colors.grey[600],
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Kullanılma: ${_formatDate(code['usedAt'])}',
                    style: GoogleFonts.figtree(
                      color: Colors.grey[600],
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ],

            if (isExpired) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(
                    Icons.warning,
                    size: 16,
                    color: Colors.red[600],
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Süresi: ${_formatDate(code['expiresAt'])}',
                    style: GoogleFonts.figtree(
                      color: Colors.red[600],
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          Icon(
            Icons.qr_code_2,
            size: 64,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            'Henüz Davet Kodu Yok',
            style: GoogleFonts.figtree(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Velini davet etmek için ilk davet kodunu oluştur',
            textAlign: TextAlign.center,
            style: GoogleFonts.figtree(
              color: Colors.grey[500],
            ),
          ),
          const SizedBox(height: 24),
          if (_summary?['canCreateMore'] == true)
            ElevatedButton.icon(
              onPressed: _createNewInviteCode,
              icon: const Icon(Icons.add),
              label: const Text('İlk Kodunu Oluştur'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _loadInviteCodes() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final apiClient = ref.read(apiClientProvider);
      final result = await apiClient.getUserInviteCodes();

      setState(() {
        _codesData = result;
        _codes = List<Map<String, dynamic>>.from(result['codes'] ?? []);
        _summary = result['summary'];
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  Future<void> _createNewInviteCode() async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(),
      ),
    );

    try {
      final apiClient = ref.read(apiClientProvider);
      await apiClient.createInviteCode('STUDENT_TO_PARENT');

      Navigator.pop(context); // Close loading dialog
      await _loadInviteCodes(); // Refresh list

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              Icon(Icons.check_circle, color: Colors.white),
              SizedBox(width: 8),
              Text('Yeni davet kodu oluşturuldu!'),
            ],
          ),
          backgroundColor: Colors.green,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      );
    } catch (e) {
      Navigator.pop(context); // Close loading dialog
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceAll('Exception: ', '')),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      );
    }
  }

  void _copyToClipboard(String code) {
    Clipboard.setData(ClipboardData(text: code));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Row(
          children: [
            Icon(Icons.check_circle, color: Colors.white),
            SizedBox(width: 8),
            Text('Kod kopyalandı!'),
          ],
        ),
        backgroundColor: Colors.green,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }

  String _formatDate(dynamic dateStr) {
    if (dateStr == null) return 'Bilinmiyor';
    try {
      final date = DateTime.parse(dateStr.toString());
      return DateFormat('dd.MM.yyyy HH:mm').format(date);
    } catch (e) {
      return 'Geçersiz tarih';
    }
  }
}
