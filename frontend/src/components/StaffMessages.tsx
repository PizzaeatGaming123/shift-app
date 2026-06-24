import { useState } from 'react';
import { useSetting } from '../lib/settings';
import { useApp } from '../store/AppContext';
import { useToast } from './ui/Toast';

interface MessageItem {
  id: string;
  sender: 'staff' | 'manager' | 'system';
  text: string;
  time: string;
  label?: string;
}

export function StaffMessages() {
  const { me, storeId } = useApp();
  const { showToast } = useToast();
  const [draft, setDraft] = useState('');
  const [messageReplies, setMessageReplies] = useSetting<Record<string, MessageItem[]>>(
    `akiyume-message-replies:${storeId ?? me?.storeId ?? 'unknown'}`,
    {},
  );

  if (!me) return null;

  const threadId = String(me.id);
  const baseMessages: MessageItem[] = [
    {
      id: `${threadId}-manager-welcome`,
      sender: 'manager',
      text: 'シフト提出・確定シフト・変更相談はこのメッセージで連絡できます。',
      time: '昨日',
    },
    {
      id: `${threadId}-manager-publish`,
      sender: 'manager',
      text: 'シフトを公開しました。スタッフ画面から確認してください。',
      time: '11:12',
      label: '一斉送信メッセージ',
    },
  ];
  const messages = [...baseMessages, ...(messageReplies[threadId] ?? [])];

  function send() {
    const text = draft.trim();
    if (!text) return;
    const nextMessage: MessageItem = {
      id: `${threadId}-staff-${Date.now()}`,
      sender: 'staff',
      text,
      time: '今',
    };
    setMessageReplies({
      ...messageReplies,
      [threadId]: [...(messageReplies[threadId] ?? []), nextMessage],
    });
    setDraft('');
    showToast('店長へメッセージを送信しました');
  }

  return (
    <section className="rk-staff-message" aria-label="メッセージ">
      <header className="rk-staff-message__head">
        <div>
          <span>中島店</span>
          <strong>店長とのメッセージ</strong>
        </div>
        <small>アプリ内連絡</small>
      </header>

      <div className="rk-staff-message__timeline">
        {messages.map((message) => {
          const self = message.sender === 'staff';
          return (
            <div
              key={message.id}
              className={`rk-message-bubble-row ${self ? 'is-self' : 'is-other'} is-${message.sender}`}
            >
              {self ? (
                <>
                  <time>{message.time}</time>
                  <div className="rk-message-bubble">
                    {message.label && <span className="rk-message-bubble__label">{message.label}</span>}
                    <p>{message.text}</p>
                  </div>
                </>
              ) : (
                <>
                  <span className="rk-message-avatar sm" aria-hidden="true">店</span>
                  <div className="rk-message-bubble">
                    {message.label && <span className="rk-message-bubble__label">{message.label}</span>}
                    <p>{message.text}</p>
                  </div>
                  <time>{message.time}</time>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="rk-staff-message__input">
        <input
          aria-label="メッセージを入力"
          placeholder="メッセージを入力"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') send();
          }}
        />
        <button type="button" onClick={send} disabled={!draft.trim()}>
          送信
        </button>
      </div>
    </section>
  );
}
