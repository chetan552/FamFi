import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../family/family_provider.dart';
import '../../core/models/models.dart';
import '../../core/fullscreen.dart' as fullscreen;

/// Returns overdue/due-today status for a chore's due date string.
({bool isOverdue, bool isDueToday}) _choreUrgency(String? dueDate) {
  if (dueDate == null) return (isOverdue: false, isDueToday: false);
  try {
    final due = DateTime.parse(dueDate);
    final today = DateTime.now();
    final todayDate = DateTime(today.year, today.month, today.day);
    final dueOnly = DateTime(due.year, due.month, due.day);
    if (dueOnly.isBefore(todayDate)) return (isOverdue: true, isDueToday: false);
    if (dueOnly.isAtSameMomentAs(todayDate)) return (isOverdue: false, isDueToday: true);
  } catch (_) {}
  return (isOverdue: false, isDueToday: false);
}

/// A full-screen, touch-friendly family dashboard designed for kiosk mode.
/// Displays all children and their tasks with large interactive buttons.
class FamilyTasksDashboard extends ConsumerStatefulWidget {
  const FamilyTasksDashboard({super.key});

  @override
  ConsumerState<FamilyTasksDashboard> createState() => _FamilyTasksDashboardState();
}

class _FamilyTasksDashboardState extends ConsumerState<FamilyTasksDashboard> {
  final Map<String, bool> _expandedChildren = {};
  final Map<String, bool> _choreLoading = {};
  Timer? _autoRefreshTimer;
  Timer? _clockTimer;
  DateTime? _lastUpdated;
  DateTime _now = DateTime.now();
  bool _isFullscreen = false;

  @override
  void initState() {
    super.initState();
    _isFullscreen = false;
    _lastUpdated = DateTime.now();
    // Load initial data
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await ref.read(familyProvider.notifier).fetchFamily();
      if (mounted) {
        setState(() {
          _lastUpdated = DateTime.now();
        });
      }
    });
    // Live clock ticking every second
    _clockTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });
    // Set up auto-refresh every 30 seconds for kiosk mode
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 30), (timer) async {
      if (mounted) {
        await ref.read(familyProvider.notifier).fetchFamily();
        if (mounted) {
          setState(() {
            _lastUpdated = DateTime.now();
          });
        }
      }
    });
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    _clockTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final familyState = ref.watch(familyProvider);
    final theme = Theme.of(context);
    final isPortrait = MediaQuery.of(context).orientation == Orientation.portrait;
    final screenWidth = MediaQuery.of(context).size.width;
    
    // Responsive grid configuration based on screen width and orientation
    final int crossAxisCount;
    final double childAspectRatio;
    if (isPortrait) {
      if (screenWidth > 600) {
        crossAxisCount = 2;
        childAspectRatio = 0.75;
      } else {
        crossAxisCount = 1;
        childAspectRatio = 0.9;
      }
    } else {
      // Landscape
      if (screenWidth > 1600) {
        crossAxisCount = 3;
        childAspectRatio = 0.7;
      } else if (screenWidth > 1200) {
        crossAxisCount = 3;
        childAspectRatio = 0.75;
      } else {
        crossAxisCount = 2;
        childAspectRatio = 0.8;
      }
    }

    if (familyState.loading && familyState.children.isEmpty) {
      return Scaffold(
        backgroundColor: theme.colorScheme.surface,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 20),
              Text(
                'Loading family dashboard...',
                style: theme.textTheme.titleMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      );
    }

    final children = familyState.children;
    final chores = familyState.chores;
    final bucketTemplates = familyState.bucketTemplates;

    // Calculate total family balance
    final familyTotal = children.fold<double>(0, (total, child) {
      final childBalance = familyState.buckets
          .where((b) => b.childId == child.id)
          .fold<double>(0, (sum, b) => sum + b.cachedBalance);
      return total + childBalance;
    });

    // Calculate pending review count
    final pendingReview = chores.where((c) => c.status == 'done').length;

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      body: SafeArea(
        child: Column(
          children: [
            // Header with family name and total balance
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              decoration: BoxDecoration(
                color: theme.colorScheme.primary,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  const Text('🏦', style: TextStyle(fontSize: 36)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          familyState.family?.name != null && familyState.family!.name.toLowerCase().startsWith('the ')
                              ? '${familyState.family!.name} Family Dashboard'
                              : 'The ${familyState.family?.name ?? 'Our'} Family Dashboard',
                          style: theme.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Family Total: \$${familyTotal.toStringAsFixed(2)}',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Colors.white.withValues(alpha: 0.9),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Live clock
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '${_now.hour.toString().padLeft(2, '0')}:${_now.minute.toString().padLeft(2, '0')}:${_now.second.toString().padLeft(2, '0')}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          fontFeatures: [FontFeature.tabularFigures()],
                        ),
                      ),
                      if (_lastUpdated != null)
                        Text(
                          'Synced ${_lastUpdated!.hour.toString().padLeft(2, '0')}:${_lastUpdated!.minute.toString().padLeft(2, '0')}',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.6),
                            fontSize: 10,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(width: 12),
                  // Pending review badge
                  if (pendingReview > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.amber,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.notifications, size: 16, color: Colors.white),
                          const SizedBox(width: 4),
                          Text(
                            '$pendingReview',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                  // Fullscreen toggle
                  IconButton(
                    onPressed: () async {
                      final next = !(_isFullscreen == true);
                      if (next) {
                        await fullscreen.enterFullscreen();
                      } else {
                        await fullscreen.exitFullscreen();
                      }
                      setState(() => _isFullscreen = next);
                    },
                    icon: Icon(
                      _isFullscreen ? Icons.fullscreen_exit : Icons.fullscreen,
                      color: Colors.white,
                    ),
                    tooltip: _isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen',
                  ),
                  // Exit button for kiosk mode (with confirmation)
                  IconButton(
                    onPressed: () async {
                      final shouldExit = await showDialog<bool>(
                        context: context,
                        builder: (context) => AlertDialog(
                          title: const Text('Exit Kiosk Mode?'),
                          content: const Text('Are you sure you want to exit the family dashboard?'),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(context, false),
                              child: const Text('STAY'),
                            ),
                            ElevatedButton(
                              onPressed: () => Navigator.pop(context, true),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.red,
                                foregroundColor: Colors.white,
                              ),
                              child: const Text('EXIT'),
                            ),
                          ],
                        ),
                      );
                      if (shouldExit == true && context.mounted) {
                        // Exit to parent dashboard
                        context.go('/');
                      }
                    },
                    icon: const Icon(Icons.exit_to_app, color: Colors.white),
                    tooltip: 'Exit to Parent Dashboard',
                  ),
                ],
              ),
            ),

            // Children grid
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async {
                  await ref.read(familyProvider.notifier).fetchFamily();
                  if (mounted) {
                    setState(() {
                      _lastUpdated = DateTime.now();
                    });
                  }
                },
                child: children.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.child_care,
                              size: 80,
                              color: theme.colorScheme.outline,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'No children yet',
                              style: theme.textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Add children in the parent dashboard',
                              style: TextStyle(
                                color: theme.colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      )
                    : GridView.builder(
                        padding: const EdgeInsets.all(16),
                        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: crossAxisCount,
                          crossAxisSpacing: 16,
                          mainAxisSpacing: 16,
                          childAspectRatio: childAspectRatio,
                        ),
                        itemCount: children.length,
                        itemBuilder: (context, index) {
                          final child = children[index];
                          final isExpanded = _expandedChildren[child.id] ?? true;
                          
                          // Get child's balance
                          final childBalance = familyState.buckets
                              .where((b) => b.childId == child.id)
                              .fold<double>(0, (sum, b) => sum + b.cachedBalance);
                          
                          // Get child's active chores
                          final assignedChores = chores
                              .where((c) => c.assignedToChildId == child.id && c.status == 'assigned')
                              .toList();
                          final doneCount = chores
                              .where((c) => c.assignedToChildId == child.id && c.status == 'done')
                              .length;
                          final totalCount = assignedChores.length + doneCount;

                          final childChores = assignedChores
                            ..sort((a, b) {
                              int key(Chore c) {
                                final u = _choreUrgency(c.dueDate);
                                if (u.isOverdue) return 0;
                                if (u.isDueToday) return 1;
                                return 2;
                              }
                              return key(a).compareTo(key(b));
                            });

                          return _ChildCard(
                            child: child,
                            balance: childBalance,
                            chores: childChores,
                            bucketTemplates: bucketTemplates,
                            buckets: familyState.buckets.where((b) => b.childId == child.id).toList(),
                            completedChores: doneCount,
                            totalChores: totalCount,
                            isExpanded: isExpanded,
                            onToggleExpand: () {
                              setState(() {
                                _expandedChildren[child.id] = !isExpanded;
                              });
                            },
                            onMarkChoreDone: (choreId) async {
                              setState(() {
                                _choreLoading[choreId] = true;
                              });
                              try {
                                await ref.read(familyProvider.notifier).updateChoreStatus(choreId, 'done');
                                if (context.mounted) {
                                  setState(() {
                                    _lastUpdated = DateTime.now();
                                  });
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: const Text('Chore marked done! 🎉'),
                                      backgroundColor: Colors.green,
                                    ),
                                  );
                                }
                              } catch (e) {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('Error: $e'),
                                      backgroundColor: Colors.red,
                                    ),
                                  );
                                }
                              } finally {
                                setState(() {
                                  _choreLoading.remove(choreId);
                                });
                              }
                            },
                            choreLoadingStates: _choreLoading,
                          );
                        },
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChildCard extends StatefulWidget {
  final UserProfile child;
  final double balance;
  final List<Chore> chores;
  final List<BucketTemplate> bucketTemplates;
  final List<Bucket> buckets;
  final bool isExpanded;
  final VoidCallback onToggleExpand;
  final Function(String) onMarkChoreDone;
  final Map<String, bool> choreLoadingStates;
  final int completedChores;
  final int totalChores;

  const _ChildCard({
    required this.child,
    required this.balance,
    required this.chores,
    required this.bucketTemplates,
    required this.buckets,
    required this.isExpanded,
    required this.onToggleExpand,
    required this.onMarkChoreDone,
    required this.choreLoadingStates,
    required this.completedChores,
    required this.totalChores,
  });

  @override
  State<_ChildCard> createState() => _ChildCardState();
}

class _ChildCardState extends State<_ChildCard> {
  final ScrollController _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isPortrait = MediaQuery.of(context).orientation == Orientation.portrait;
    final child = widget.child;
    final balance = widget.balance;
    final chores = widget.chores;
    final bucketTemplates = widget.bucketTemplates;
    final buckets = widget.buckets;
    final isExpanded = widget.isExpanded;
    final onToggleExpand = widget.onToggleExpand;
    final onMarkChoreDone = widget.onMarkChoreDone;
    final choreLoadingStates = widget.choreLoadingStates;

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
      child: InkWell(
        onTap: onToggleExpand,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Child header with avatar and balance
              Row(
                children: [
                  CircleAvatar(
                    radius: isPortrait ? 30 : 24,
                    backgroundColor: theme.colorScheme.primaryContainer,
                    child: Text(
                      child.avatarEmoji,
                      style: TextStyle(
                        fontSize: isPortrait ? 28 : 22,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          child.name,
                          style: theme.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          theme.colorScheme.primary,
                          theme.colorScheme.primary.withValues(alpha: 0.8),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '\$${balance.toStringAsFixed(2)}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 20,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    isExpanded ? Icons.expand_less : Icons.expand_more,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ],
              ),

              // Progress bar
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: widget.totalChores == 0
                            ? 0.0
                            : widget.completedChores / widget.totalChores,
                        minHeight: 8,
                        backgroundColor: theme.colorScheme.surfaceContainerHighest,
                        valueColor: const AlwaysStoppedAnimation<Color>(Colors.green),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${widget.completedChores}/${widget.totalChores} done',
                    style: TextStyle(
                      fontSize: 12,
                      color: theme.colorScheme.onSurfaceVariant,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // Buckets summary (only show if not expanded)
              if (!isExpanded && bucketTemplates.isNotEmpty)
                SizedBox(
                  height:40,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: bucketTemplates.length,
                    itemBuilder: (context, index) {
                      final template = bucketTemplates[index];
                      final bucket = buckets.firstWhere(
                        (b) => b.templateId == template.id,
                        orElse: () => Bucket(
                          id: '',
                          childId: child.id,
                          templateId: template.id,
                          month: DateTime.now().month,
                          year: DateTime.now().year,
                          cachedBalance: 0,
                        ),
                      );
                      
                      return Container(
                        margin: const EdgeInsets.only(right: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: template.parsedColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: template.parsedColor.withValues(alpha: 0.3),
                            width: 1,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(template.emoji),
                            const SizedBox(width: 4),
                            Text(
                              '\$${bucket.cachedBalance.toStringAsFixed(0)}',
                              style: TextStyle(
                                color: template.parsedColor,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),

              if (!isExpanded && bucketTemplates.isNotEmpty) const SizedBox(height: 12),
              
              if (!isExpanded) const Spacer(),

              // Expanded content with chores - scrollable
              if (isExpanded)
                Expanded(
                  child: Scrollbar(
                    controller: _scrollController,
                    child: SingleChildScrollView(
                      controller: _scrollController,
                      physics: const ClampingScrollPhysics(),
                      child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 8),

                        if (chores.isEmpty)
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Center(
                              child: Text(
                                'No active chores! 🎉',
                                style: TextStyle(
                                  color: theme.colorScheme.onSurfaceVariant,
                                  fontSize: 16,
                                ),
                              ),
                            ),
                          )
                        else
                          ...chores.map((chore) {
                            final isLoading = choreLoadingStates[chore.id] ?? false;
                            
                            final (:isOverdue, :isDueToday) = _choreUrgency(chore.dueDate);
                            
                            return Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              decoration: BoxDecoration(
                                color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: theme.colorScheme.outlineVariant,
                                  width: 1,
                                ),
                              ),
                              child: Padding(
                                padding: const EdgeInsets.all(12),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            chore.title,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 16,
                                            ),
                                          ),
                                          Row(
                                            children: [
                                              if (chore.isRecurring)
                                                Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    Icon(
                                                      Icons.repeat,
                                                      size: 12,
                                                      color: Colors.deepPurple,
                                                    ),
                                                    const SizedBox(width: 2),
                                                    Text(
                                                      chore.recurrencePeriod ?? 'recurring',
                                                      style: TextStyle(
                                                        color: Colors.deepPurple,
                                                        fontSize: 10,
                                                        fontWeight: FontWeight.bold,
                                                      ),
                                                    ),
                                                    const SizedBox(width: 8),
                                                  ],
                                                ),
                                              if (chore.dueDate != null)
                                                Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    Icon(
                                                      Icons.calendar_today,
                                                      size: 12,
                                                      color: isOverdue ? Colors.red : (isDueToday ? Colors.orange : theme.colorScheme.onSurfaceVariant),
                                                    ),
                                                    const SizedBox(width: 2),
                                                    Text(
                                                      chore.dueDate!,
                                                      style: TextStyle(
                                                        color: isOverdue ? Colors.red : (isDueToday ? Colors.orange : theme.colorScheme.onSurfaceVariant),
                                                        fontSize: 10,
                                                        fontWeight: (isOverdue || isDueToday) ? FontWeight.bold : FontWeight.normal,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                            ],
                                          ),
                                          // Overdue warning
                                          if (isOverdue || isDueToday)
                                            Padding(
                                              padding: const EdgeInsets.only(top: 4),
                                              child: Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                decoration: BoxDecoration(
                                                  color: isOverdue ? Colors.red.withValues(alpha: 0.1) : Colors.orange.withValues(alpha: 0.1),
                                                  borderRadius: BorderRadius.circular(6),
                                                  border: Border.all(
                                                    color: isOverdue ? Colors.red.withValues(alpha: 0.3) : Colors.orange.withValues(alpha: 0.3),
                                                    width: 1,
                                                  ),
                                                ),
                                                child: Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    Icon(
                                                      isOverdue ? Icons.warning : Icons.timer,
                                                      size: 10,
                                                      color: isOverdue ? Colors.red : Colors.orange,
                                                    ),
                                                    const SizedBox(width: 4),
                                                    Text(
                                                      isOverdue ? 'Overdue' : 'Due today!',
                                                      style: TextStyle(
                                                        color: isOverdue ? Colors.red : Colors.orange,
                                                        fontSize: 10,
                                                        fontWeight: FontWeight.bold,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: theme.colorScheme.primary.withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        '\$${chore.value.toStringAsFixed(2)}',
                                        style: TextStyle(
                                          color: theme.colorScheme.primary,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    SizedBox(
                                      width: 120,
                                      height: 56,
                                      child: ElevatedButton(
                                        onPressed: isLoading ? null : () => onMarkChoreDone(chore.id),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: Colors.green,
                                          foregroundColor: Colors.white,
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(12),
                                          ),
                                          padding: const EdgeInsets.symmetric(horizontal: 8),
                                        ),
                                        child: isLoading
                                            ? const SizedBox(
                                                width: 20,
                                                height: 20,
                                                child: CircularProgressIndicator(
                                                  strokeWidth: 2,
                                                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                                ),
                                              )
                                            : const Row(
                                                mainAxisAlignment: MainAxisAlignment.center,
                                                children: [
                                                  Icon(Icons.check, size: 20),
                                                  SizedBox(width: 4),
                                                  Text(
                                                    'DONE',
                                                    style: TextStyle(
                                                      fontWeight: FontWeight.bold,
                                                      fontSize: 12,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }),

                        const SizedBox(height: 16),

                        // Buckets detailed view
                        if (bucketTemplates.isNotEmpty) ...[
                          Text(
                            'Savings Buckets',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: bucketTemplates.map((template) {
                              final bucket = buckets.firstWhere(
                                (b) => b.templateId == template.id,
                                orElse: () => Bucket(
                                  id: '',
                                  childId: child.id,
                                  templateId: template.id,
                                  month: DateTime.now().month,
                                  year: DateTime.now().year,
                                  cachedBalance: 0,
                                ),
                              );
                              
                              return Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                decoration: BoxDecoration(
                                  color: template.parsedColor.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: template.parsedColor.withValues(alpha: 0.3),
                                    width: 2,
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      template.emoji,
                                      style: const TextStyle(fontSize: 20),
                                    ),
                                    const SizedBox(width: 8),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          template.name,
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            color: template.parsedColor,
                                            fontSize: 12,
                                          ),
                                        ),
                                        Text(
                                          '\$${bucket.cachedBalance.toStringAsFixed(2)}',
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            color: template.parsedColor,
                                            fontSize: 16,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                )
            ],
          ),
        ),
      ),
    );
  }
}
