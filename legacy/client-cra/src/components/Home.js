import React from 'react'
import '../css/App.css'
import header from '../css/header.svg'
import { Link} from 'react-router-dom'
import Categories from '../components/Categories'
import Testimonal from '../components/Testimonal'
import Question from '../components/Question'
import Course from '../components/Courses'


const Home = () => {
  return (
    <>
      <header>
        <div className="containers header_container">
          <div className="header_left">
            <h1>Grow your skills to advance your career path</h1>
            <p>
              A roadmap for career development
            </p>
            <Link to="/Courses" className="btn btn-primary">Get Started</Link>
          </div>

          <div className="header_right">
            <div className="header_right-image">
              <img src={header} alt="" srcSet="" />
            </div>
          </div>
        </div>
      </header>

      <Categories/>
      <Course/>
      <Question/>
      <Testimonal/>



    </>
  )
}

export default Home
