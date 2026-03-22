import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Text, TextInput, IconButton, useTheme, Card, Avatar, Chip } from 'react-native-paper';
import { Stack, useLocalSearchParams } from 'expo-router';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { useFamilyStore } from '@/store/familyStore';
import { askMoneyMentor, ChatMessage } from '@/services/aiService';
import { spacing } from '@/constants/theme';

export default function MentorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  
  const { children, buckets, chores } = useFamilyStore();
  const child = children.find(c => c.id === id);
  
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: `Hi ${child?.name || 'there'}! I'm your Money Mentor 🤖. How can I help you reach your goals today?` }
  ]);

  if (!child) return null;

  const totalBalance = buckets.reduce((sum, b) => sum + (b.cached_balance || 0), 0);
  const childChores = chores.filter(c => c.assigned_to_child_id === child.id);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: inputText.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setLoading(true);

    try {
      const aiResponseText = await askMoneyMentor(newMessages, child.name, totalBalance, childChores);
      setMessages([...newMessages, { role: 'assistant', content: aiResponseText }]);
    } catch (error: any) {
      setMessages([...newMessages, { role: 'assistant', content: `Oops! 🚨 ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scrollable={false}>
      <Stack.Screen options={{ title: 'Money Mentor', headerBackVisible: true }} />
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg, idx) => {
            const isMe = msg.role === 'user';
            return (
              <View key={idx} style={[styles.bubbleWrapper, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
                {!isMe && <Avatar.Text size={32} label="🤖" style={{ backgroundColor: theme.colors.primaryContainer, marginRight: 8 }} />}
                <Card style={[styles.bubble, { flexShrink: 1 }, isMe ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.surfaceVariant }]} mode="contained">
                  <Card.Content style={styles.bubbleContent}>
                    <Text style={{ color: isMe ? theme.colors.onPrimary : theme.colors.onSurfaceVariant, fontSize: 16 }}>
                      {msg.content}
                    </Text>
                  </Card.Content>
                </Card>
              </View>
            );
          })}
          
          {loading && (
            <View style={[styles.bubbleWrapper, styles.bubbleLeft]}>
               <Avatar.Text size={32} label="🤖" style={{ backgroundColor: theme.colors.primaryContainer, marginRight: 8 }} />
               <View style={styles.loadingBubble}>
                 <ActivityIndicator size="small" color={theme.colors.primary} />
               </View>
            </View>
          )}
        </ScrollView>

        {messages.length === 1 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.suggestionsContainer}
          >
            {[
              "What chores can I do to earn more?", 
              "How much money do I have?", 
              "How can I save for a $50 video game?"
            ].map((suggestion, i) => (
              <Chip 
                key={i} 
                style={styles.suggestionChip} 
                textStyle={{ fontSize: 12 }}
                onPress={() => setInputText(suggestion)}
              >
                {suggestion}
              </Chip>
            ))}
          </ScrollView>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            mode="outlined"
            placeholder="Ask me a money question..."
            value={inputText}
            onChangeText={setInputText}
            style={styles.input}
            onSubmitEditing={sendMessage}
            disabled={loading}
          />
          <IconButton
            icon="send"
            mode="contained"
            containerColor={theme.colors.primary}
            iconColor={theme.colors.onPrimary}
            size={24}
            onPress={sendMessage}
            disabled={!inputText.trim() || loading}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  bubbleWrapper: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  bubbleLeft: {
    alignSelf: 'flex-start',
  },
  bubbleRight: {
    alignSelf: 'flex-end',
  },
  bubble: {
    borderRadius: 20,
  },
  bubbleContent: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  loadingBubble: {
    padding: 16,
    backgroundColor: 'transparent',
  },
  suggestionsContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
    height: 40,
    maxHeight: 40,
  },
  suggestionChip: {
    backgroundColor: '#6200ee15',
    marginRight: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
