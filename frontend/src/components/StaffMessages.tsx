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
  authorId?: string;
}

export function StaffMessages() {
  const { me, staff, storeId } = useApp();
  const { showToast } = useToast();
  const [selectedContactId, setSelectedContactId] = useState('manager');
  const [draft, setDraft] = useState('');
  const [messageReplies, setMessageReplies] = useSetting<Record<string, MessageItem[]>>(
    `akiyume-message-replies:${storeId ?? me?.storeId ?? 'unknown'}`,
    {},
  );

  if (!me) return null;

  const myId = String(me.id);
  const coworkers = staff.filter((person) => person.role === 'STAFF' && person.id !== myId);
  const contacts = [
    {
      id: 'manager',
      name: '店長',
      caption: 'シフト相談',
      threadId: myId,
      avatar: '店',
      baseMessages: [
        {
          id: `${myId}-manager-welcome`,
          sender: 'manager' as const,
          text: 'シフト提出・確定シフト・変更相談はこのメッセージで連絡できます。',
          time: '昨日',
        },
        {
          id: `${myId}-manager-publish`,
          sender: 'manager' as const,
          text: 'シフトを公開しました。スタッフ画面から確認してください。',
          time: '11:12',
          label: '一斉送信メッセージ',
        },
      ],
    },
    ...coworkers.map((person) => {
      const pair = [myId, person.id].sort().join(':');
      return {
        id: person.id,
        name: person.name,
        caption: person.employmentType,
        threadId: `staff:${pair}`,
        avatar: person.name.slice(0, 1),
        baseMessages: [
          {
            id: `${person.id}-hello`,
            sender: 'staff' as const,
            authorId: person.id,
            text: 'シフトの交代や確認があれば、ここで相談できます。',
            time: '今日',
          },
        ],
      };
    }),
  ];
  const activeContact = contacts.find((contact) => contact.id === selectedContactId) ?? contacts[0];
  const threadId = activeContact.threadId;
  const messages: MessageItem[] = [...activeContact.baseMessages, ...(messageReplies[threadId] ?? [])];

  function send() {
    const text = draft.trim();
    if (!text) return;
    const nextMessage: MessageItem = {
      id: `${threadId}-staff-${Date.now()}`,
      sender: 'staff',
      authorId: myId,
      text,
      time: '今',
    };
    setMessageReplies({
      ...messageReplies,
      [threadId]: [...(messageReplies[threadId] ?? []), nextMessage],
    });
    setDraft('');
    showToast(`${activeContact.name}へメッセージを送信しました`);
  }

  return (
    <section className="rk-staff-message" aria-label="メッセージ">
      <header className="rk-staff-message__head">
        <div>
          <span>中島店</span>
          <strong>{activeContact.name}とのメッセージ</strong>
        </div>
        <small>{activeContact.caption}</small>
      </header>

      <div className="rk-staff-message__contacts" aria-label="メッセージ相手">
        {contacts.map((contact) => (
          <button
            type="button"
            key={contact.id}
            className={contact.id === activeContact.id ? 'is-active' : undefined}
            onClick={() => setSelectedContactId(contact.id)}
          >
            <span>{contact.name}</span>
            <small>{contact.caption}</small>
          </button>
        ))}
      </div>

      <div className="rk-staff-message__timeline">
        {messages.map((message) => {
          const self = message.sender === 'staff' && (!message.authorId || message.authorId === myId);
          const avatar = message.sender === 'manager' ? '店' : activeContact.avatar;
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
                  <span className="rk-message-avatar sm" aria-hidden="true">{avatar}</span>
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
