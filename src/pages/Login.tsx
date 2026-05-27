import { useEffect, useState } from "preact/hooks"
import { supabase } from "../api/client";
// import { useAuth } from "../../context/AuthContext";

type Status = "idle" | "loading" | "success" | "error";

export function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState<boolean>(false)
    const [status, setStatus] = useState<Status>("idle");
    const [errorMsg, setErrorMsg] = useState("");
    // const { session, loading } = useAuth();


    async function handleLogin() {
        setStatus("loading");
        setErrorMsg("");

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setStatus("error");
            setErrorMsg(error.message);
        } else {
            setStatus("success");
            setTimeout(() => {
                window.location.href = "/";
            }, 800); // brief pause so she sees the success state
        }
    }

    return (
        <div style={{
            // maxWidth: '60ch',
            // marginInline: 'auto'
        }}>
            <h2>Login</h2>
            <div style={{
                display: 'inline-flex',
                flexDirection: 'column',
            }}>
                {status === "error" && <p>{errorMsg}</p>}
                {status === "success" && <p style={{color: 'green'}}>✓ Successfully logged in</p>}
                <label for="uname"><b>Email</b></label>
                <input type="text" value={email} disabled={status === "loading" || status === "success"} onInput={e => setEmail(e.currentTarget.value)} placeholder="Email" name="uname" required/>
                <label for="psw"><b>Password</b></label>
                <input type={showPass ? 'text' : 'password'} value={password} disabled={status === "loading" || status === "success"} onInput={e => setPassword(e.currentTarget.value)} placeholder="Password" name="psw" required/>
                <label>
                    <input type="checkbox" checked={showPass} onChange={() => setShowPass(!showPass)} name="remember"/> Show password
                </label>
                <br/>
                <button type="submit" onClick={handleLogin}>
                    {status === "idle" && "Login"}
                    {status === "loading" && "Signing in..."}
                    {status === "success" && "✓ Success!"}
                    {status === "error" && "Try again"}
                </button>
            </div>
            <br/>
            {/* <span class="psw">Forgot <a href="#">password?</a></span> */}
        </div>
    )
}