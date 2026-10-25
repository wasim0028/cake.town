import React, { useState } from 'react'
import { useNavigate} from 'react-router-dom'
import User from '../images/Add User-pana.svg'
import '../css/Signup.css'


function Signup() {
    const navigate = useNavigate()
    const [user, setUser] = useState({
        name: "", email: "", phone: "", work: "", password: "", cpassword: ""
    })

    let name, value

    const handleInput = (e) => {
        console.log(e)
        name = e.target.name
        value = e.target.value

        setUser({ ...user, [name]: value })
    }

    const PostData = async (e) =>{
        e.preventDefault(e)

        const {name, email, phone, work, password, cpassword} = user

        const ress = await fetch("/signup",{
            method: "POST",
            headers: { 'Content-Type' : 'application/json' },
            body: JSON.stringify({
                name, email, phone, work, password, cpassword
            })
        })

        await ress.json()


        if(ress.status === 422  || !ress){
            window.alert("Invalid Credential")
        }
        else{
            window.alert("Resigteration Successfull")
            navigate("/login")

        }


    }
    return (
        <>

            <div className="container_Box">
                <aside className="Box_aside">
                    <div className="image_container">
                        <img src={User} alt="" />
                    </div>
                    <h2>Add User</h2>
                    
                </aside>
                <form method='POST' className='Box_form'>
                    <div className="user-details">
                        <div className="input-box">
                            <span className="details">Full Name</span>
                            <input type="text" name="name" placeholder="Enter your name" required
                                onChange={handleInput} value={user.name}
                            />
                        </div>

                        
                        <div className="input-box">
                            <span className="details">Email</span>
                            <input type="text" name="email" placeholder="Enter your Email" required
                                onChange={handleInput} value={user.email}
                            />
                        </div>
                        <div className="input-box">
                            <span className="details">Phone Number</span>
                            <input type="text" name="phone" placeholder="Enter your phone number" required
                                onChange={handleInput} value={user.phone}
                            />
                        </div>
                        <div className="input-box">
                            <span className="details">Profession</span>
                            <input type="text" name="work" placeholder="Enter your profession" required
                                onChange={handleInput} value={user.work}
                            />
                        </div>
                        <div className="input-box">
                            <span className="details">Password</span>
                            <input type="password" name="password" placeholder="Enter your password" required
                                onChange={handleInput} value={user.password}
                            />
                        </div>
                        <div className="input-box">
                            <span className="details">Confirm Password</span>
                            <input type="password" name="cpassword" placeholder="Confirm your Password" required
                                onChange={handleInput} value={user.cpassword}
                            />
                        </div>

                    </div>

                    <div className="buttons">
                        <input type="submit" value="Signup" onClick={PostData} />
                    </div>
                </form>
            </div>
        </>
    )
}

export default Signup
