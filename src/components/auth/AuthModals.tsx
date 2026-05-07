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
  const [suStep, setSuStep] = useState<'form' | 'verify'>('form')
  const [otpCode, setOtpCode] = useState('')
  const [otpErr, setOtpErr] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)

  // forgot pw
  const [fpEmail, setFpEmail] = useState('')
  const [fpMsg, setFpMsg]     = useState('')
  const [fpErr, setFpErr]     = useState('')

  async function submitSignIn() {
    setSiErr(''); setSiLoading(true)
    const identifier = siId.trim()
    if (!identifier || !siPw) { setSiErr('All fields required'); setSiLoading(false); return }
    let email = identifier
    if (!identifier.includes('@')) {
      const { data: p } = await supabase.from('profiles').select('email').ilike('username', identifier).single()
      if (!p?.email) { setSiErr('Username not found'); setSiLoading(false); return }
      email = p.email
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password: siPw })
    setSiLoading(false)
    if (error) { setSiErr(error.message || 'Sign in failed'); return }
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
    const { data: existing } = await supabase.from('profiles').select('id').ilike('username', username).maybeSingle()
    if (existing) { setSuErr('Username already taken'); setSuLoading(false); return }
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { username } } })
    setSuLoading(false)
    if (error) { setSuErr(error.message || 'Sign up failed. Please try again.'); return }
    setSuStep('verify')
  }

  async function submitOtp() {
    setOtpErr(''); setOtpLoading(true)
    const token = otpCode.trim()
    if (token.length !== 6) { setOtpErr('Enter the 6-digit code from your email'); setOtpLoading(false); return }
    const { error } = await supabase.auth.verifyOtp({ email: suEmail.trim(), token, type: 'signup' })
    setOtpLoading(false)
    if (error) { setOtpErr(error.message || 'Invalid code. Please try again.'); return }
    setSuUser(''); setSuEmail(''); setSuPw(''); setOtpCode(''); setSuStep('form')
    closeModal('signUpModal')
    await refreshProfile()
    showToast(`✓ Welcome to FINZ, @${suUser.trim()}!`)
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
      <Modal id="signUpModal" title={suStep === 'form' ? 'Create Account' : 'Verify Your Email'}
        footer={
          <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:10 }}>
            {suStep === 'form' ? (
              <>
                <button className="btn btn-primary" style={{ width:'100%', padding:'10px 0' }} onClick={submitSignUp} disabled={suLoading}>
                  {suLoading ? 'Sending code…' : 'Create Account'}
                </button>
                <div className="auth-switch">Already have an account? <span onClick={() => { closeModal('signUpModal'); openModal('signInModal') }}>Sign In</span></div>
              </>
            ) : (
              <>
                <button className="btn btn-primary" style={{ width:'100%', padding:'10px 0' }} onClick={submitOtp} disabled={otpLoading}>
                  {otpLoading ? 'Verifying…' : 'Verify Code'}
                </button>
                <div className="auth-switch"><span onClick={() => setSuStep('form')}>← Back</span></div>
              </>
            )}
          </div>
        }>
        {suStep === 'form' ? (
          <>
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
          </>
        ) : (
          <>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:16, lineHeight:1.6 }}>
              We sent a 6-digit code to <strong>{suEmail}</strong>. Check your inbox and enter it below.
            </div>
            <div className="form-group">
              <label className="form-label">Verification Code</label>
              <input
                className="form-input"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                style={{ fontSize:24, letterSpacing:8, textAlign:'center', fontFamily:'IBM Plex Mono,monospace' }}
                onKeyDown={e => e.key === 'Enter' && submitOtp()}
                autoFocus
              />
            </div>
            {otpErr && <div className="form-error">{otpErr}</div>}
          </>
        )}
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
