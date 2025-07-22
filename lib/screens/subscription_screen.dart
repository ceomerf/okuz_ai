import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/subscription_provider.dart';
import '../services/subscription_service.dart';
import '../widgets/main_layout.dart';

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  _SubscriptionScreenState createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen>
    with TickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _slideAnimation;
  late AnimationController _glowController;

  String _selectedPeriod = 'monthly';
  int _founderCount = 0;
  Map<String, dynamic>? _subscriptionData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 800));
    _fadeAnimation =
        Tween<double>(begin: 0.0, end: 1.0).animate(_animationController);
    _slideAnimation =
        Tween<double>(begin: 50.0, end: 0.0).animate(_animationController);
    _glowController =
        AnimationController(vsync: this, duration: const Duration(seconds: 2));

    _animationController.forward();
    _glowController.repeat(reverse: true);
    _loadSubscriptionData();
  }

  @override
  void dispose() {
    _animationController.dispose();
    _glowController.dispose();
    super.dispose();
  }

  Future<void> _loadSubscriptionData() async {
    try {
      final subscriptionProvider =
          Provider.of<SubscriptionProvider>(context, listen: false);
      await subscriptionProvider.loadSubscription();
      final founderCount =
          await Provider.of<SubscriptionService>(context, listen: false)
              .getFounderMemberCount();

      if (mounted) {
        setState(() {
          _founderCount = founderCount;
          _subscriptionData = subscriptionProvider.currentSubscription;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Veri yüklenirken bir hata oluştu: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return MainLayout(
      child: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  Text('Abonelik Planları',
                      style: Theme.of(context).textTheme.headlineMedium),
                  const SizedBox(height: 16),
                  _buildPlanSelector(),
                  const SizedBox(height: 24),
                  _buildPlanDetails(),
                  const SizedBox(height: 24),
                  _buildFounderInfo(),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () {
                      // Handle subscription
                    },
                    child: const Text('Abone Ol'),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildPlanSelector() {
    return SegmentedButton<String>(
      segments: const [
        ButtonSegment(value: 'monthly', label: Text('Aylık')),
        ButtonSegment(value: 'yearly', label: Text('Yıllık')),
        ButtonSegment(value: 'oneTime', label: Text('Tek Seferlik')),
      ],
      selected: {_selectedPeriod},
      onSelectionChanged: (newSelection) {
        setState(() {
          _selectedPeriod = newSelection.first;
        });
      },
    );
  }

  Widget _buildPlanDetails() {
    // This would be built based on _selectedPeriod
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Text('${_selectedPeriod.toUpperCase()} Planı',
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            const Text('Detaylar burada gösterilecek.'),
          ],
        ),
      ),
    );
  }

  Widget _buildFounderInfo() {
    return Text('$_founderCount kurucu üyemiz var!');
  }
}

class SubscriptionPlan {
  final String title;
  final String price;
  final String period;
  final List<String> features;
  final bool isPopular;

  SubscriptionPlan({
    required this.title,
    required this.price,
    required this.period,
    required this.features,
    this.isPopular = false,
  });
}
