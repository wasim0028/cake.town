import React,{useEffect} from 'react'
import '../css/App.css'
import '../css/About.css'
import Peeasha from '../images/Peeasha.jpg'
import Sumit from '../images/Sumit.jpg'
import Neha from '../images/Neha.jpg'
import Expert from '../images/Expert.jpg'
import bihari from '../images/bihari.jpg'
import Anahita from '../images/Anahita.png'
import keshari from '../images/keshari.jpg'
import Shatta from '../images/Shatta.jpg'

import Aboutimg from '../images/about.svg'
import { NavLink,useNavigate } from 'react-router-dom'

function About() {
    const navigate = useNavigate()
    const callAboutPage = async () =>{
        try {
            const res = await fetch('/About', {
                method : "GET",
                headers : {
                    Accept : "application/json",
                    "Content-Type" : "application/json"
                },
                credentials : "include"
            })

            const data = await res.json()

            if(!res.status === 200 || !data){
                const error = new Error(res.error)
                throw error
            }
        } catch (error) {
            console.log(error)  
            navigate('/login')          
        }
    }

    useEffect(() =>{
        callAboutPage()
    })

    return (
        <>
            <form method="GET">
            <section className="about_achievements">
                
                <div className="container about_achievements-container">
                    <div className="about_achievements-left">
                        <img src={Aboutimg} alt='' />
                    </div>

                    <div className="about_achievements-right">
                        <h1>Achievements</h1>
                        <p>Optimism is essential to achievement and it is also the foundation of courage and true progress</p>
                        <div className="achievements_cards">
                            <article className="achievement_card">
                                <span className="achievement_icon">
                                    <i className="uil uil-video"></i>
                                </span>
                                <h3>450+</h3>
                                <p>Courses</p>
                            </article>

                            <article className="achievement_card">
                                <span className="achievement_icon">
                                    <i className="uil uil-users-alt"></i>
                                </span>
                                <h3>79,000</h3>
                                <p>Students</p>
                            </article>

                            <article className="achievement_card">
                                <span className="achievement_icon">
                                    <i className="uil uil-trophy"></i>
                                </span>
                                <h3>26+</h3>
                                <p>Awards</p>
                            </article>


                        </div>
                    </div>
                </div>
                
            </section>

            <section className="team">
                <h2>Meet Our Team</h2>
                <div className="container team_container">

                    <article className="team_member">
                        <div className="team_member-image">
                            <img src={Sumit} alt=''  />
                        </div>
                        <div className="team_member-info">
                            <h4>Ravinder Bhogal</h4>
                            <p>Food Writer</p>
                        </div>
                        <div className="team_member-socials">
                            <NavLink to="https://instagram.com" target='_blank' ><i className="uil uil-instagram"></i></NavLink>
                            <NavLink to="https://twitter.com" target='_blank' ><i className="uil uil-twitter-alt"></i></NavLink>
                            <NavLink to="https://linkedin.com" target='_blank' ><i className="uil uil-linkedin-alt"></i></NavLink>
                        </div>
                    </article>

                    <article className="team_member">
                        <div className="team_member-image">
                            <img src={Neha} alt='' />
                        </div>
                        <div className="team_member-info">
                            <h4>Garima Arora</h4>
                            <p>Expert Tutor</p>
                        </div>
                        <div className="team_member-socials">
                            <NavLink to="https://instagram.com" target='_blank' ><i className="uil uil-instagram"></i></NavLink>
                            <NavLink to="https://twitter.com" target='_blank' ><i className="uil uil-twitter-alt"></i></NavLink>
                            <NavLink to="https://linkedin.com" target='_blank' ><i className="uil uil-linkedin-alt"></i></NavLink>
                        </div>
                    </article>

                    <article className="team_member">
                        <div className="team_member-image">
                            <img src={Peeasha} alt='' />
                        </div>
                        <div className="team_member-info">
                            <h4>Fardip Singh</h4>
                            <p>Expert Tutor</p>
                        </div>
                        <div className="team_member-socials">
                            <NavLink to="https://instagram.com" target='_blank' ><i className="uil uil-instagram"></i></NavLink>
                            <NavLink to="https://twitter.com" target='_blank' ><i className="uil uil-twitter-alt"></i></NavLink>
                            <NavLink to="https://linkedin.com" target='_blank' ><i className="uil uil-linkedin-alt"></i></NavLink>
                        </div>
                    </article>

                    <article className="team_member">
                        <div className="team_member-image">
                            <img src={Expert} alt=''  />
                        </div>
                        <div className="team_member-info">
                            <h4>Shatta Wale</h4>
                            <p>Expert Tutor</p>
                        </div>
                        <div className="team_member-socials">
                            <NavLink to="https://instagram.com" target='_blank' ><i className="uil uil-instagram"></i></NavLink>
                            <NavLink to="https://twitter.com" target='_blank' ><i className="uil uil-twitter-alt"></i></NavLink>
                            <NavLink to="https://linkedin.com" target='_blank' ><i className="uil uil-linkedin-alt"></i></NavLink>
                        </div>
                    </article>

                    <article className="team_member">
                        <div className="team_member-image">
                            <img src={Anahita} alt=''  />
                        </div>
                        <div className="team_member-info">
                            <h4>Shatta Wale</h4>
                            <p>Expert Tutor</p>
                        </div>
                        <div className="team_member-socials">
                            <NavLink to="https://instagram.com" target='_blank' ><i className="uil uil-instagram"></i></NavLink>
                            <NavLink to="https://twitter.com" target='_blank' ><i className="uil uil-twitter-alt"></i></NavLink>
                            <NavLink to="https://linkedin.com" target='_blank' ><i className="uil uil-linkedin-alt"></i></NavLink>
                        </div>
                    </article>

                    <article className="team_member">
                        <div className="team_member-image">
                            <img src={bihari} alt='' />
                        </div>
                        <div className="team_member-info">
                            <h4>Penpa Tsering</h4>
                            <p>Expert Tutor</p>
                        </div>
                        <div className="team_member-socials">
                            <NavLink to="https://instagram.com" target='_blank' ><i className="uil uil-instagram"></i></NavLink>
                            <NavLink to="https://twitter.com" target='_blank' ><i className="uil uil-twitter-alt"></i></NavLink>
                            <NavLink to="https://linkedin.com" target='_blank' ><i className="uil uil-linkedin-alt"></i></NavLink>
                        </div>
                    </article>

                    <article className="team_member">
                        <div className="team_member-image">
                            <img src={keshari} alt='' />
                        </div>
                        <div className="team_member-info">
                            <h4>Anahita Dhondy</h4>
                            <p>Expert Chef</p>
                        </div>
                        <div className="team_member-socials">
                            <NavLink to="https://instagram.com" target='_blank' ><i className="uil uil-instagram"></i></NavLink>
                            <NavLink to="https://twitter.com" target='_blank' ><i className="uil uil-twitter-alt"></i></NavLink>
                            <NavLink to="https://linkedin.com" target='_blank' ><i className="uil uil-linkedin-alt"></i></NavLink>
                        </div>
                    </article>

                    <article className="team_member">
                        <div className="team_member-image">
                            <img src={Shatta} alt='' />
                        </div>
                        <div className="team_member-info">
                            <h4>Shatta Male</h4>
                            <p>Expert Tutor</p>
                        </div>
                        <div className="team_member-socials">
                            <NavLink to="https://instagram.com" target='_blank' ><i className="uil uil-instagram"></i></NavLink>
                            <NavLink to="https://twitter.com" target='_blank' ><i className="uil uil-twitter-alt"></i></NavLink>
                            <NavLink to="https://linkedin.com" target='_blank' ><i className="uil uil-linkedin-alt"></i></NavLink>
                        </div>
                    </article>
                </div>
            </section>
            </form>
        </>
    )
}

export default About
