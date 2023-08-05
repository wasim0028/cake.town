import React, { useEffect, useState } from 'react'
import '../css/Contact.css'
import '../css/App.css'
import Connected from '../images/Connected.svg'
import { NavLink } from 'react-router-dom'

function Contact() {


    const [userData, setUserData] = useState({ name: "", phone: "", email: "" })
    const userContact = async () => {
        try {
            const res = await fetch('/GetData', {
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                },
            })

            const data = await res.json()
            setUserData({ ...userData, name: data.name, phone: data.phone, email: data.email })

            if (!res.status === 200 || !data) {
                const error = new Error(res.error)
                throw error
            }
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        userContact()
    })

    const handlInputs = (e) => {
        const name = e.target.name
        const value = e.target.value
        setUserData({ ...userData, [name]: value })
    }


    window.onbeforeunload = () => {
        for (const form of document.getElementsByTagName('form')) {
            form.reset();
        }
    }


    return (
        <>

            <section className="contact">
                <div className="container contact_container">
                    <aside className="contact_aside">
                        <div className="aside_imgae">
                            <img src={Connected} alt='' />
                        </div>
                        <h2>Contact Us</h2>
                        <p>Let's have a talk</p>
                        <ul className="contact_details">
                            <li>
                                <i className="uil uil-phone-times"></i>
                                <h5>+91 1234567890</h5>
                            </li>
                            <li>
                                <i className="uil uil-envelope"></i>
                                <h5>caketown@gmail.com</h5>
                            </li>
                            <li>
                                <i className="uil uil-location-point"></i>
                                <h5>Siwan, India</h5>
                            </li>
                        </ul>
                        <ul className="contact_socials">
                            <li><NavLink to="https://instagram.com" target='_blank' ><i className="uil uil-instagram"></i></NavLink></li>
                            <li><NavLink to="https://facebook.com" target='_blank' ><i className="uil uil-facebook-f"></i></NavLink></li>
                            <li><NavLink to="https://twitter.com" target='_blank' ><i className="uil uil-twitter"></i></NavLink></li>
                            <li><NavLink to="https://linkedin.com" target='_blank' ><i className="uil uil-linkedin-alt"></i></NavLink></li>
                        </ul>
                    </aside>

                    <form action="https://formspree.io/f/xayzeyww" method="POST" className="contact_form ">
                        <div className="form_name">
                            <input type="text" name="name" placeholder="User Name" required autoComplete="off" onChange={handlInputs} />
                            <input type="text" name="phone" placeholder="Phone Number" required autoComplete="off" onChange={handlInputs} />
                        </div>
                        <input type="text" name="email" placeholder="User Email Address" required autoComplete="off" onChange={handlInputs} />
                        <textarea name="message" rows="7" placeholder="Messages" required ></textarea>
                        <button type="submit"  value="contact" className="btn btn-primary">Send Message</button>
                    </form>
                </div>
            </section>

        </>
    )
}

export default Contact
