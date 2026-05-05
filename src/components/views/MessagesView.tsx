'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Avatar from '@/components/ui/Avatar'
import Modal from '@/components/ui/Modal'
import { useApp } from '@/contexts/AppContext'
import type { Message, Profile } from '@/lib/types'

function convId(a: string, b: string) {
  return [a, b].sort().join('_')
}

type Convo = { partner: Profile; lastMsg: string; unread: number; ts: string }

export default function MessagesView() {
  const { user, openModal, closeModal, showToast, setUnreadDMs, pendingChatPartnerId, setPendingChatPartnerId } = useApp()
  const supabase = createClient()
  const [convos, setConvos]       = useState<Convo[]>([])
  const [chatPartner, setChatPartner] = useState<Profile | null>(null)
  const [messages, setMessages]   = useState<Message[]>([])
  const [input, setInput]         = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [newErr, setNewErr]       = useState('')
  const msgsRef = useRef<HTMLDivElement>(null)

  async function loadConvos() {
    if (!user) return
    const { data } = await supabase
      .from('messages')
      .select('*, sender:sender_id(id,username,display_name,avatar_url), recipient:recipient_id(id,username,display_name,avatar_url)')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (!data) return
    const seen = new Map<string, Convo>()
    ;(data as (Message & { sender: Profile; recipient: Profile })[]).forEach(m => {
      const other = m.sender_id === user.id ? m.recipient : m.sender
      if (!other) return
      if (!seen.has(other.id)) {
        seen.set(other.id, { partner: other, lastMsg: m.body, unread: 0, ts: m.created_at })
      }
      if (m.recipient_id === user.id && !m.read) {
        seen.get(other.id)!.unread++
      }
    })
    setConvos(Array.from(seen.values()))
  }

  async function openChat(partner: Profile) {
    setChatPartner(partner)
    const cid = convId(user!.id, partner.id)
    const { data } = await supabase
      .from('messages')
      .select('*, sender:sender_id(id,username,display_name,avatar_url)')
      .eq('conversation_id', cid)
      .order('created_at', { ascending: true })
    setMessages((data ?? []) as Message[])
    // mark read
    await supabase.from('messages').update({ read: true }).eq('conversation_id', cid).eq('recipient_id', user!.id).eq('read', false)
    setUnreadDMs(0)
    setTimeout(() => { msgsRef.current?.scrollTo(0, msgsRef.current.scrollHeight) }, 80)
  }

  async function sendMsg() {
    if (!user || !chatPartner || !input.trim()) return
    const cid = convId(user.id, chatPartner.id)
    const { data } = await supabase.from('messages').insert({
      conversation_id: cid,
      sender_id: user.id,
      recipient_id: chatPartner.id,
      body: input.trim(),
    }).select('*, sender:sender_id(id,username,display_name,avatar_url)').single()
    if (data) setMessages(m => [...m, data as Message])
    setInput('')
    // notify recipient
    await supabase.from('notifications').insert({ user_id: chatPartner.id, from_user_id: user.id, type: 'message', message: `@${user.email?.split('@')[0]} sent you a message` })
    setTimeout(() => { msgsRef.current?.scrollTo(0, msgsRef.current.scrollHeight) }, 60)
  }

  async function startNewDM() {
    setNewErr('')
    const target = newTarget.trim().replace(/^@/, '')
    if (!target) { setNewErr('Enter a username'); return }
    const { data: p } = await supabase.from('profiles').select('*').ilike('username', target).single()
    if (!p) { setNewErr('User not found'); return }
    if (p.id === user!.id) { setNewErr("You can't message yourself"); return }
    closeModal('newMsgModal')
    setNewTarget('')
    await openChat(p as Profile)
  }

  useEffect(() => { loadConvos() }, [user])

  useEffect(() => {
    if (!pendingChatPartnerId || !user) return
    async function autoOpen() {
      const { data } = await supabase.from('profiles').select('*').eq('id', pendingChatPartnerId!).single()
      if (data) await openChat(data as Profile)
      setPendingChatPartnerId(null)
    }
    autoOpen()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingChatPartnerId, user])

  // realtime new messages
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('dm-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` },
        async (payload) => {
          loadConvos()
          // if chat is open with this sender, append message
          if (chatPartner && (payload.new as Message).sender_id === chatPartner.id) {
            const { data } = await supabase.from('messages').select('*, sender:sender_id(id,username,display_name,avatar_url)').eq('id', (payload.new as Message).id).single()
            if (data) setMessages(m => [...m, data as Message])
            await supabase.from('messages').update({ read: true }).eq('id', (payload.new as Message).id)
            setTimeout(() => { msgsRef.current?.scrollTo(0, msgsRef.current.scrollHeight) }, 60)
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user, chatPartner])

  if (!user) return (
    <div>
      <div className="topbar"><div className="topbar-inner"><div className="topbar-title">Messages</div></div></div>
      <div className="auth-gate"><div className="auth-gate-icon">✉</div><div className="auth-gate-msg">Sign in to send messages.</div></div>
    </div>
  )

  if (chatPartner) {
    const partnerName = chatPartner.display_name || chatPartner.username
    return (
      <div className="chat-wrap">
        <div className="chat-header">
          <button className="chat-back" onClick={() => { setChatPartner(null); loadConvos() }}>←</button>
          <Avatar size="sm" src={chatPartner.avatar_url} initials={partnerName.slice(0,2).toUpperCase()} />
          <div>
            <div style={{ fontSize:13, fontWeight:700 }}>{partnerName}</div>
            <div style={{ fontSize:10, color:'var(--text3)' }}>@{chatPartner.username}</div>
          </div>
        </div>
        <div className="chat-msgs" ref={msgsRef}>
          {!messages.length && <div style={{ textAlign:'center', fontSize:12, color:'var(--text3)', padding:'30px 0' }}>Start the conversation!</div>}
          {messages.map(m => {
            const mine = m.sender_id === user.id
            return (
              <div key={m.id} className={`chat-msg${mine ? ' mine' : ''}`}>
                <div>
                  <div className="chat-time" style={{ textAlign: mine ? 'right' : 'left' }}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                  </div>
                  <div className="chat-bubble">{m.body}</div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="chat-input-area">
          <input className="chat-input" value={input} onChange={e => setInput(e.target.value)} placeholder={`Message @${chatPartner.username}…`} onKeyDown={e => e.key === 'Enter' && sendMsg()} />
          <button className="chat-send-btn" onClick={sendMsg}>↑</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="topbar">
        <div className="topbar-inner">
          <div className="topbar-title">Messages</div>
          <button className="btn btn-primary btn-sm" style={{ marginLeft:'auto' }} onClick={() => openModal('newMsgModal')}>+ New Message</button>
        </div>
      </div>
      {!convos.length
        ? <div className="dm-empty"><div style={{ fontSize:28, marginBottom:10 }}>✉</div>No messages yet.<br />Hit <b>+ New Message</b> to start a conversation.</div>
        : convos.map(c => {
          const name = c.partner.display_name || c.partner.username
          return (
            <div key={c.partner.id} className={`dm-list-item${c.unread ? ' unread' : ''}`} onClick={() => openChat(c.partner)}>
              <Avatar size="md" src={c.partner.avatar_url} initials={name.slice(0,2).toUpperCase()} />
              <div className="dm-preview">
                <div className="dm-name">{name} <span style={{ color:'var(--text3)', fontWeight:400, fontSize:11 }}>@{c.partner.username}</span></div>
                <div className="dm-last">{c.lastMsg}</div>
              </div>
              {c.unread > 0 && (
                <div style={{ background:'var(--gold)', color:'#fff', fontSize:10, fontWeight:700, borderRadius:'50%', width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{c.unread}</div>
              )}
            </div>
          )
        })
      }

      <Modal id="newMsgModal" title="New Message"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => closeModal('newMsgModal')}>Cancel</button>
            <button className="btn btn-primary" onClick={startNewDM}>Start Conversation</button>
          </>
        }>
        <div className="form-group">
          <label className="form-label">Username</label>
          <input className="form-input" value={newTarget} onChange={e => setNewTarget(e.target.value)} placeholder="Enter a username to message" onKeyDown={e => e.key === 'Enter' && startNewDM()} />
          {newErr && <div className="form-error">{newErr}</div>}
        </div>
      </Modal>
    </div>
  )
}

