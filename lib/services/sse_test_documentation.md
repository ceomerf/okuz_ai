# SSE Implementation Test Documentation

## Backend Test (using `curl`)

### 1. Test the SSE Endpoint Directly

Open a terminal and run a `curl` command to connect directly to your local NestJS SSE endpoint:

```bash
curl -N -X GET \
  -H "Content-Type: text/event-stream" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:3002/smart-tools/quick-chat-stream?message=Bana%20fotosentezi%20anlat&subject=Biyoloji&grade=9"
```

**Expected Output:**
You should see `data:` lines appearing on your terminal one by one, not all at once:

```
data: {"type":"STATUS","content":"AI yanıtı hazırlanıyor..."}
data: {"type":"TEXT_CHUNK","content":"Fotosentez"}
data: {"type":"TEXT_CHUNK","content":" bitkilerin"}
data: {"type":"TEXT_CHUNK","content":" güneş ışığını"}
data: {"type":"TEXT_CHUNK","content":" kullanarak"}
data: {"type":"METADATA_CHUNK","content":{"response":"Fotosentez bitkilerin güneş ışığını kullanarak...","followUpQuestions":["Fotosentezin aşamaları nelerdir?","Klorofil nedir?","Fotosentez neden önemlidir?"]}}
```

### 2. Test with PowerShell (Windows)

```powershell
Invoke-WebRequest -Uri "http://localhost:3002/smart-tools/quick-chat-stream?message=Merhaba&subject=matematik&grade=9" -Method GET -Headers @{"Content-Type"="text/event-stream"; "Authorization"="Bearer YOUR_JWT_TOKEN"}
```

## Frontend Test (in Flutter)

### 1. Add Debug Logs to Provider

In your `smart_tools_provider.dart`, inside the `listen` callback, add print statements:

```dart
_streamSubscription = _apiService.quickChatStream(
  message: message,
  subject: subject,
  grade: grade,
).listen(
  (chunk) {
    print('📝 Chunk alındı: $chunk'); // Add this line
    _aiResponseText += chunk;
    notifyListeners();
  },
  onError: (error) {
    print('❌ Stream hatası: $error'); // Add this line
    setError('Streaming hatası: ${error.toString()}');
    _isStreaming = false;
    notifyListeners();
  },
  onDone: () {
    print('✅ Stream tamamlandı'); // Add this line
    _isStreaming = false;
    
    if (_aiResponseText.isNotEmpty) {
      addNewMessage('ai', _aiResponseText);
    }
    
    notifyListeners();
  },
);
```

### 2. Test in Flutter App

1. Run your Flutter app
2. Navigate to the smart tools screen
3. Send a message using the streaming function
4. Check your debug console

**Expected Console Output:**
```
🔗 HTTP Stream Bağlantısı başlatılıyor: http://89.116.38.173:3002/smart-tools/quick-chat-stream?message=Merhaba&subject=matematik&grade=9
📝 Chunk alındı: Merhaba
📝 Chunk alındı: ! 
📝 Chunk alındı: Matematik
📝 Chunk alındı: dersinde
📝 Chunk alındı: size
📝 Chunk alındı: nasıl
📝 Chunk alındı: yardım
📝 Chunk alındı: edebilirim?
✅ Stream tamamlandı
```

### 3. Verify UI Updates

- The text should appear word-by-word (or chunk-by-chunk) as the data arrives
- The loading indicator should show while streaming
- The final response should be added to chat history
- Suggested replies should appear after the stream completes

## Troubleshooting

### Common Issues:

1. **Connection Refused**: Make sure your backend server is running on port 3002
2. **Authentication Error**: Ensure you have a valid JWT token
3. **CORS Issues**: Check if your backend allows CORS for SSE connections
4. **Stream Not Starting**: Check if the SSE endpoint is properly configured in your NestJS controller

### Debug Steps:

1. **Test Backend First**: Use curl to verify the backend SSE endpoint works
2. **Check Network**: Use browser dev tools or Flutter inspector to see network requests
3. **Verify Headers**: Ensure proper headers are being sent
4. **Check Logs**: Look at both backend and frontend logs for errors

## Integration with UI

### Example Usage in Widget:

```dart
class SmartToolsScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Consumer<SmartToolsProvider>(
      builder: (context, provider, child) {
        return Column(
          children: [
            // Chat history
            Expanded(
              child: ListView.builder(
                itemCount: provider.chatHistory.length,
                itemBuilder: (context, index) {
                  final message = provider.chatHistory[index];
                  return ChatMessageWidget(
                    sender: message['sender']!,
                    message: message['message']!,
                  );
                },
              ),
            ),
            
            // Streaming response
            if (provider.isStreaming)
              Container(
                padding: EdgeInsets.all(16),
                child: Text(
                  provider.aiResponseText,
                  style: TextStyle(fontStyle: FontStyle.italic),
                ),
              ),
            
            // Message input
            MessageInputWidget(
              onSendMessage: (message) {
                provider.sendMessageAndStreamResponse(
                  message: message,
                  subject: 'matematik',
                  grade: '9',
                );
              },
            ),
          ],
        );
      },
    );
  }
}
```

This documentation provides a comprehensive guide for testing both the backend and frontend SSE implementation. 