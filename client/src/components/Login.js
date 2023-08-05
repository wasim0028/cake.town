import React, { useContext, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import '../css/Login.css'

import { UserContext } from '../App'



function Login() {

    const { dispatch } = useContext(UserContext)

    const navigate = useNavigate()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const userLogin = async (e) => {
        e.preventDefault()
        const res = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        })

        const data = await res.json()

        if (res.status === 400 || !data) {
            window.alert("Invalid Credentials")
        }
        else {
            dispatch({ type: "USER", payload: true })
            window.alert("Login Successfull")
            navigate("/")
        }
    }


    return (
        <>

            <div className="wrapper">
                <form className='new_wrapper' method='POST'>
                    <h1>Login</h1>
                    <div className="input-box_log">
                        <input type="text" placeholder="User Email" required
                            value={email}
                            onChange={(e) => { setEmail(e.target.value) }}
                        />
                    </div>
                    <div className="input-box_log">
                        <input type="password" placeholder="Password" required
                            value={password}
                            onChange={(e) => { setPassword(e.target.value) }}
                        />
                    </div>
                    <div className="remember-forgot">
                        <label >Remember me <input className="check_box" type="checkbox" /></label>
                        <NavLink to="/">Forgot password?</NavLink>
                    </div>
                    <button type="submit" className='btn' onClick={userLogin}>Login</button>
                    <div className="register-link">
                        <p>Don't have an account?</p>
                        <NavLink className="sign" to="/Signup">Signup Now</NavLink>
                    </div>
                </form>
            </div>
        </>
    )
}

export default Login
