'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import { useApp } from '@/contexts/AppContext'

export default function AuthModals() {
  const { openModal, closeModal, showToast, refreshProfile } = useApp()
  const supabase = createClient()

  // sign-in
  const [siId, setSiId]     = useState('')
  const [siPw, setSiPw]     = useState('')
  const [siErr, setSiErr]   = useState('')
  const [siLoading, setSiLoading] = useState(false)

  // sign-up
  const [suUser, setSuUser] = useState('')
  const [suEmail, setSuEmail] = useState('')
  const [suPw, setSuPw]     = useState('')
  const [suErr, setSuErr]   = useState('')
  const [suLoading, setSuLoading] = useState(false)

  // forgot pw
  const [fpEmail, setFpEmail] = useState('')
  const [fpMsg, setFpMsg]     = useState('')
  const [fpErr, setFpErr]     = useState('')

  async function submitSignIn() {
    setSiErr(''); setSiLoading(true)
    const identifier = siId.trim()
    if (!identifier || !siPw) { setSiErr('All fields required'); setSiLoading(false); return }
    // allow login by username: first look up email
    let email = identifier
    if (!identifier.includes('@')) {
      const { data: p } = await supabase.from('profiles').select('email').ilike('username', identifier).single()
      if (!p?.email) { setSiErr('Username not found'); setSiLoading(false); return }
      email = p.email
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password: siPw })
    setSiLoading(false)
    if (error) { setSiErr(error.message); return }
    setSiId(''); setSiPw('')
    closeModal('signInModal')
    await refreshProfile()
    showToast('✓ Welcome back!')
  }

  async function submitSignUp() {
    setSuErr(''); setSuLoading(true)
    const username = suUser.trim().replace(/^@/, '')
    const email    = suEmail.trim()
    const password = suPw
    if (!username || !email || !password) { setSuErr('All fields required'); setSuLoading(false); return }
    if (username.length < 3) { setSuErr('Username must be at least 3 characters'); setSuLoading(false); return }
    if (password.length < 6) { setSuErr('Password must be at least 6 characters'); setSuLoading(false); return }
    // check username unique
    const { data: existing } = await supabase.from('profiles').select('id').ilike('username', username).maybeSingle()
    if (existing) { setSuErr('Username already taken'); setSuLoading(false); return }
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { username } } })
    setSuLoading(false)
    if (error) { setSuErr(error.message); return }
    setSuUser(''); setSuEmail(''); setSuPw('')
    closeModal('signUpModal')
    await refreshProfile()
    showToast(`✓ Welcome to FINZ, @${username}!`)
  }

  async function submitForgotPw() {
    setFpErr(''); setFpMsg('')
    const email = fpEmail.trim()
    if (!email) { setFpErr('Enter your email'); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) { setFpErr(error.message); return }
    setFpMsg('Check your email for a reset link.')
  }

  return (
    <>
      {/* SIGN IN */}
      <Modal id="signInModal" title="Sign In to FINZ"
        footer={
          <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:10 }}>
            <button className="btn btn-primary" style={{ width:'100%', padding:'10px 0' }} onClick={submitSignIn} disabled={siLoading}>
              {siLoading ? 'Signing in…' : 'Sign In'}
            </button>
            <div className="auth-switch">No account? <span onClick={() => { closeModal('signInModal'); openModal('signUpModal') }}>Create one</span></div>
          </div>
        }>
        <div className="form-group">
          <label className="form-label">Username or Email</label>
          <input className="form-input" value={siId} onChange={e => setSiId(e.target.value)} placeholder="@username or you@email.com" onKeyDown={e => e.key === 'Enter' && submitSignIn()} />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" value={siPw} onChange={e => setSiPw(e.target.value)} placeholder="Your password" onKeyDown={e => e.key === 'Enter' && submitSignIn()} />
          <div style={{ marginTop:6, textAlign:'right' }}>
            <span style={{ fontSize:11, color:'var(--text3)', cursor:'pointer' }} onClick={() => { closeModal('signInModal'); openModal('forgotPwModal') }}>Forgot password?</span>
          </div>
        </div>
        {siErr && <div className="form-error">{siErr}</div>}
      </Modal>

      {/* SIGN UP */}
      <Modal id="signUpModal" title="Create Account"
        footer={
          <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:10 }}>
            <button className="btn btn-primary" style={{ width:'100%', padding:'10px 0' }} onClick={submitSignUp} disabled={suLoading}>
              {suLoading ? 'Creating…' : 'Create Account'}
            </button>
            <div className="auth-switch">Already have an account? <span onClick={() => { closeModal('signUpModal'); openModal('signInModal') }}>Sign In</span></div>
          </div>
        }>
        <div className="form-group">
          <label className="form-label">Username</label>
          <input className="form-input" value={suUser} onChange={e => setSuUser(e.target.value)} placeholder="e.g. jsmith_models" />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={suEmail} onChange={e => setSuEmail(e.target.value)} placeholder="you@email.com" />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" value={suPw} onChange={e => setSuPw(e.target.value)} placeholder="Min 6 characters" onKeyDown={e => e.key === 'Enter' && submitSignUp()} />
        </div>
        {suErr && <div className="form-error">{suErr}</div>}
      </Modal>

      {/* FORGOT PASSWORD */}
      <Modal id="forgotPwModal" title="Reset Password"
        footer={
          <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:10 }}>
            {!fpMsg && <button className="btn btn-primary" style={{ width:'100%', padding:'10px 0' }} onClick={submitForgotPw}>Send Reset Link</button>}
            {fpMsg && <div style={{ fontSize:12, color:'var(--green)', fontFamily:'IBM Plex Mono,monospace' }}>{fpMsg}</div>}
            <div className="auth-switch"><span onClick={() => { closeModal('forgotPwModal'); openModal('signInModal') }}>← Back to Sign In</span></div>
          </div>
        }>
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input className="form-input" type="email" value={fpEmail} onChange={e => setFpEmail(e.target.value)} placeholder="you@email.com" />
        </div>
        {fpErr && <div className="form-error">{fpErr}</div>}
      </Modal>
    </>
  )
}
