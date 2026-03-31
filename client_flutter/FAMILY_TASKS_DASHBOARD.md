# Family Tasks Dashboard - Kiosk Mode

## Overview
The Family Tasks Dashboard is a full-screen, touch-friendly interface designed for kiosk mode display in a central family area (e.g., kitchen tablet, mounted touch screen). It provides an interactive view of all children and their tasks, allowing children to check off completed chores directly from the dashboard.

## Features

### 1. **Full-Screen Kiosk Interface**
- Optimized for touch interaction with large buttons and clear visual hierarchy
- Responsive design that adapts to portrait and landscape orientations
- Auto-refresh every 30 seconds to keep data current
- Confirmation dialog for exiting kiosk mode

### 2. **Family Overview Header**
- Displays family name and total savings balance
- Shows pending review count with notification badge
- Timestamp showing last data update
- Exit button (with confirmation) to return to parent dashboard

### 3. **Interactive Child Cards**
- **Collapsed View**: Shows child avatar, name, balance, and active chore count
- **Expanded View**: Toggle with tap to reveal:
  - Complete list of active chores with "DONE" buttons
  - Chore details (title, value, due date, recurrence status)
  - Overdue/today warnings with visual indicators
  - Detailed savings buckets with individual balances

### 4. **Chore Management**
- Large green "DONE" buttons for easy touch interaction
- Loading indicators during processing
- Success/error snackbar notifications
- Visual indicators for:
  - Recurring chores (repeat icon)
  - Due dates (calendar icon with color coding)
  - Overdue tasks (red warning badge)
  - Today's due tasks (orange timer badge)

### 5. **Real-time Updates**
- Auto-refresh timer (30 seconds)
- Manual pull-to-refresh
- Instant updates when chores are marked as done
- Timestamp showing last update time

## Access & Navigation

### From Parent Dashboard
1. Navigate to the parent dashboard (`/`)
2. Find the "Family Dashboard" card in the Quick Actions section
3. Tap to enter full-screen kiosk mode

### Exit Kiosk Mode
1. Tap the exit icon (↩️) in the top-right corner
2. Confirm "EXIT" in the dialog
3. Returns to parent dashboard

## Technical Implementation

### File Structure
```
lib/features/dashboard/family_tasks_dashboard.dart  # Main dashboard screen
lib/core/router.dart                                # Route configuration (/family-tasks-dashboard)
lib/features/dashboard/parent_dashboard.dart        # Added navigation button
```

### Dependencies Used
- `dart:async` for Timer-based auto-refresh
- `flutter_riverpod` for state management
- `go_router` for navigation
- Built-in Flutter widgets: `GridView`, `RefreshIndicator`, `Card`, `ElevatedButton`

### State Management
- Uses existing `familyProvider` for data
- Local state for expanded/collapsed cards
- Loading states for individual chore actions
- Timer for auto-refresh (cancelled on dispose)

### Responsive Design
- **Portrait**: Single column of child cards
- **Landscape**: Two-column grid layout
- Dynamic font sizes based on orientation
- Touch-optimized button sizes (minimum 48x48px)

## Use Cases

### 1. **Family Command Center**
- Mount a tablet in the kitchen or family room
- Keep the dashboard always visible
- Children can check off chores as they complete them

### 2. **Morning/Evening Routines**
- Visual checklist for daily responsibilities
- Clear expectations with due dates
- Instant gratification with "DONE" button feedback

### 3. **Parent-Child Interaction**
- Parents can see at a glance what needs to be done
- Children learn responsibility with interactive feedback
- Financial education through visible savings buckets

### 4. **Accountability & Motivation**
- Overdue warnings encourage timely completion
- Visual progress tracking
- Connection between chores and savings goals

## Design Considerations

### Touch Targets
- Minimum button size: 48x48 pixels
- Generous spacing between interactive elements
- Clear visual feedback on tap

### Visual Hierarchy
1. Family header (primary color)
2. Child cards (elevated surfaces)
3. Chore items (subtle backgrounds)
4. Action buttons (high contrast)

### Color Coding
- **Primary**: Family total and main actions
- **Green**: "DONE" buttons and success states
- **Red**: Overdue warnings and errors
- **Orange**: Today's due dates
- **Purple**: Recurring chores

### Accessibility
- High contrast text
- Clear iconography
- Touch-friendly sizing
- Screen reader compatible (semantic labels)

## Future Enhancements

### Potential Features
1. **Voice Commands**: "Hey Google, mark chore as done"
2. **Custom Backgrounds**: Family photos as dashboard background
3. **Achievement Badges**: Visual rewards for consistency
4. **Weekly/Monthly Reports**: Performance statistics
5. **Parent Notifications**: Push notifications when chores are completed
6. **Chore History**: Visual timeline of completed tasks
7. **Goal Tracking**: Progress bars for savings goals

### Technical Improvements
1. **WebSocket Support**: Real-time updates without polling
2. **Offline Support**: Cache data for temporary network loss
3. **Multi-language Support**: Internationalization
4. **Theming Options**: Dark/light mode synchronization
5. **Export Data**: CSV/PDF reports of chore completion

## Setup Instructions

### For New Installation
1. Ensure Flutter project is set up with dependencies
2. Add the route to `lib/core/router.dart`:
   ```dart
   GoRoute(
     path: '/family-tasks-dashboard',
     builder: (context, state) => const FamilyTasksDashboard(),
   ),
   ```
3. Add navigation button to parent dashboard
4. Build and deploy to target device

### For Existing Installation
1. Copy `family_tasks_dashboard.dart` to `lib/features/dashboard/`
2. Update router configuration
3. Add navigation button as shown in parent dashboard changes
4. Run `flutter pub get` and `flutter pub run build_runner build`

## Troubleshooting

### Common Issues
1. **Types not found**: Ensure `import '../../core/models/models.dart';` is included
2. **Build errors**: Run `flutter clean` and `flutter pub get`
3. **Routing issues**: Verify route is added before the shell route in router.dart
4. **State not updating**: Check familyProvider is properly initialized

### Performance Tips
1. Use `const` constructors where possible
2. Implement `AutomaticKeepAliveClientMixin` if needed
3. Consider pagination for large families (10+ children)
4. Optimize image assets for target device resolution

## Support
For issues or feature requests, please refer to the main FamFi project documentation or contact the development team.