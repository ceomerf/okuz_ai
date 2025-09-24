# Flutter Streaming Dialogue Implementation

## Overview

This implementation provides real-time streaming dialogue functionality in Flutter using Server-Sent Events (SSE). Users can see AI responses being generated word-by-word in real-time, creating a more engaging and interactive experience.

## Key Components

### 1. SSEDialogueService
Handles SSE connections and stream processing.

```dart
final sseService = SSEDialogueService();

// Connect to stream
final stream = sseService.connectToStream(
  message: "Hello",
  dialogueMode: "socratic",
  conversationId: "conv_123",
);
```

### 2. DialogueProvider (Enhanced)
Manages state and handles streaming events.

```dart
final dialogueProvider = DialogueProvider();

// Send message with streaming
await dialogueProvider.sendMessageStreaming("Hello");
```

### 3. StreamingChatWidget
UI component that demonstrates streaming functionality.

## Usage Examples

### Basic Streaming Implementation

```dart
class ChatScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (context) => DialogueProvider(),
      child: const StreamingChatWidget(),
    );
  }
}
```

### Custom Streaming Implementation

```dart
class CustomChatWidget extends StatefulWidget {
  @override
  _CustomChatWidgetState createState() => _CustomChatWidgetState();
}

class _CustomChatWidgetState extends State<CustomChatWidget> {
  late DialogueProvider _dialogueProvider;
  String _currentTypingResponse = '';

  @override
  void initState() {
    super.initState();
    _dialogueProvider = DialogueProvider();
    
    // Listen to provider changes
    _dialogueProvider.addListener(_onProviderChanged);
  }

  void _onProviderChanged() {
    setState(() {
      _currentTypingResponse = _dialogueProvider.aiTypingResponse;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Chat messages
        Expanded(
          child: ListView.builder(
            itemCount: _dialogueProvider.chatHistory.length + 
                (_dialogueProvider.isStreaming ? 1 : 0),
            itemBuilder: (context, index) {
              if (index == _dialogueProvider.chatHistory.length && 
                  _dialogueProvider.isStreaming) {
                return _buildTypingIndicator();
              }
              return _buildMessage(_dialogueProvider.chatHistory[index]);
            },
          ),
        ),
        
        // Input area
        _buildInputArea(),
      ],
    );
  }

  Widget _buildTypingIndicator() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Text(_currentTypingResponse.isNotEmpty 
              ? _currentTypingResponse 
              : 'AI is typing...'),
          const SizedBox(width: 8),
          const SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ],
      ),
    );
  }

  Widget _buildInputArea() {
    final controller = TextEditingController();
    
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              enabled: !_dialogueProvider.isSendingMessage,
            ),
          ),
          IconButton(
            onPressed: _dialogueProvider.isSendingMessage 
                ? null 
                : () => _sendMessage(controller.text),
            icon: const Icon(Icons.send),
          ),
        ],
      ),
    );
  }

  void _sendMessage(String message) {
    if (message.trim().isEmpty) return;
    _dialogueProvider.sendMessageStreaming(message.trim());
  }
}
```

## Event Handling

The `DialogueProvider` handles different SSE event types:

### Event Types

1. **START** - AI is beginning to process
2. **TEXT_CHUNK** - Real-time text chunks from AI
3. **METADATA_CHUNK** - Structured metadata (suggested replies, mode switches)
4. **COMPLETE** - Stream completed
5. **ERROR** - Error occurred
6. **FALLBACK** - Fallback response

### Event Processing

```dart
void _handleSSEEvent(SSEEvent event) {
  switch (event.type) {
    case 'TEXT_CHUNK':
      // Append text to typing response
      _aiTypingResponse += event.data['content'];
      notifyListeners();
      break;
      
    case 'METADATA_CHUNK':
      // Process final metadata
      _processMetadata(event.data['content']);
      break;
      
    case 'COMPLETE':
      // Finalize response
      _finalizeStreamingResponse();
      break;
  }
}
```

## State Management

### Key State Variables

```dart
String _aiTypingResponse = '';        // Current typing text
bool _isStreaming = false;            // Streaming status
List<String> _suggestedReplies = [];  // Suggested replies
String? _pendingModeSwitch;           // Mode switch suggestion
```

### State Updates

```dart
// Update typing response
_aiTypingResponse += chunkText;
notifyListeners();

// Process metadata
_suggestedReplies = List<String>.from(metadata['suggestedReplies']);
notifyListeners();

// Finalize response
addNewMessage('assistant', _aiTypingResponse);
_aiTypingResponse = '';
_isStreaming = false;
notifyListeners();
```

## UI Features

### 1. Real-time Typing Indicator
Shows AI response being built word-by-word:

```dart
Widget _buildTypingIndicator() {
  return Container(
    child: Text(
      dialogueProvider.aiTypingResponse.isNotEmpty 
          ? dialogueProvider.aiTypingResponse 
          : 'AI is typing...',
    ),
  );
}
```

### 2. Suggested Replies
Horizontal scrollable buttons for quick responses:

```dart
ListView.builder(
  scrollDirection: Axis.horizontal,
  itemCount: dialogueProvider.suggestedReplies.length,
  itemBuilder: (context, index) {
    return ElevatedButton(
      onPressed: () => _sendMessage(dialogueProvider.suggestedReplies[index]),
      child: Text(dialogueProvider.suggestedReplies[index]),
    );
  },
)
```

### 3. Mode Switch Dialog
Non-intrusive dialog for mode switching:

```dart
if (dialogueProvider.pendingModeSwitch != null)
  Container(
    child: Column(
      children: [
        Text('Mod Değişikliği Önerisi'),
        Row(
          children: [
            ElevatedButton(
              onPressed: () => dialogueProvider.acceptModeSwitch(),
              child: Text('Evet, Mentor Moduna Geç'),
            ),
            OutlinedButton(
              onPressed: () => dialogueProvider.declineModeSwitch(),
              child: Text('Hayır, Sokrat ile Devam Et'),
            ),
          ],
        ),
      ],
    ),
  )
```

## Error Handling

### Connection Errors
```dart
_streamSubscription = stream.listen(
  (event) => _handleSSEEvent(event),
  onError: (error) {
    setError('Streaming error: ${error.toString()}');
  },
);
```

### Fallback Responses
```dart
case 'FALLBACK':
  _processFallbackResponse(event.data['content']);
  break;
```

## Performance Considerations

### 1. Memory Management
- Cancel subscriptions on dispose
- Clear typing response when done
- Limit chat history size

```dart
@override
void dispose() {
  _streamSubscription?.cancel();
  super.dispose();
}
```

### 2. UI Updates
- Use `notifyListeners()` sparingly
- Batch UI updates when possible
- Use `Consumer` widget for selective rebuilds

### 3. Network Handling
- Handle connection timeouts
- Provide fallback responses
- Retry logic for failed connections

## Testing

### Simulated Streaming
For testing without backend:

```dart
final sseService = SSEDialogueService();

// Use simulated stream
final stream = sseService.connectToSimulatedStream(
  message: "Hello",
  dialogueMode: "socratic",
);
```

### Unit Testing
```dart
test('should handle TEXT_CHUNK events', () {
  final provider = DialogueProvider();
  
  provider._handleSSEEvent(SSEEvent(
    type: 'TEXT_CHUNK',
    data: {'content': 'Hello '},
  ));
  
  expect(provider.aiTypingResponse, 'Hello ');
});
```

## Best Practices

1. **Always cancel subscriptions** when disposing widgets
2. **Handle all event types** including errors and fallbacks
3. **Provide visual feedback** during streaming
4. **Use proper error boundaries** for production
5. **Test with slow networks** to ensure good UX
6. **Implement retry logic** for failed connections
7. **Cache conversation history** appropriately
8. **Handle mode switching** gracefully

## Migration from REST

To migrate from REST to streaming:

1. Replace `sendMessage()` with `sendMessageStreaming()`
2. Add streaming state variables
3. Update UI to show typing indicators
4. Handle SSE events in provider
5. Test thoroughly with real backend

The streaming implementation provides a much more engaging user experience with real-time feedback and progressive UI updates. 