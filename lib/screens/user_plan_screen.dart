import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/mock_database_service.dart';
import '../models/long_term_plan.dart';

class UserPlanScreen extends StatelessWidget {
  const UserPlanScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Kullanıcı Planı'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: FutureBuilder<List<LongTermPlan>>(
        future:
            Provider.of<MockDatabaseService>(context, listen: false).getPlans(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Hata: ${snapshot.error}'));
          }
          if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return const Center(child: Text('Plan bulunamadı.'));
          }
          // Display plans
          return ListView.builder(
            itemCount: snapshot.data!.length,
            itemBuilder: (context, index) {
              final plan = snapshot.data![index];
              return ListTile(
                title: Text(plan.title),
                subtitle: Text(plan.description),
              );
            },
          );
        },
      ),
    );
  }
}
