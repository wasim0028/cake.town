import React from 'react'
import '../css/App.css'
import Baking from '../images/Baking and Desserts.jpg'
import Pastry from '../images/pastry_chef.jpg'
import Cake from '../images/cake.webp'
import { Link } from 'react-router-dom'

const Course = () => {
  return (
    <>
     <section className="courses" style={{marginTop: '5rem'}}>
        <h2>Our Popular Course</h2>
        <div className="container container_courses">
            <article className="course">
                <div className="course_image">
                    <img src={Baking} alt=""/>
                </div>
                <div className="course_info">
                    <h4>Professional Programmes Course In Baking & Desserts</h4>
                    <p>"It's all about a balancing act between time, temperature and ingredients: That's the art of
                        baking."</p>
                    <Link to="/Courses" className="btn btn-primary">Learn More</Link>
                </div>
            </article>

            <article className="course">
                <div className="course_image">
                    <img src={Pastry} alt=""/>
                </div>
                <div className="course_info">
                    <h4>Professional Bakery & Pastry Chef Programmes Course</h4>
                    <p>The great thing about pastry is there are so many avenues - it's very hard to get bored doing
                        this.</p>
                    <Link to="/Courses" className="btn btn-primary">Learn More</Link>
                </div>
            </article>

            <article className="course">
                <div className="course_image">
                    <img src={Cake} alt=""/>
                </div>
                <div className="course_info">
                    <h4>Young Chef Program</h4>
                    <p>If cooking is what you love, do it with great vigor, pride, and excellence</p>
                    <Link to="/Courses" className="btn btn-primary">Learn More</Link>
                </div>
            </article>
        </div>
    </section>
      
    </>
  )
}

export default Course
