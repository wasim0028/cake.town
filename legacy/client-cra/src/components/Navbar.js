import React, { useContext, useState } from 'react'
import '../css/App.css'
import { Link, NavLink } from 'react-router-dom'
// import PropTypes from 'prop-types'

import { UserContext } from '../App'

const Navbar = (props) => {
  const { state } = useContext(UserContext)
  const RenderMenu = () => {
    if (state) {
      return (
        <>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/About">About</Link></li>
          <li><Link to="/Courses">Courses</Link></li>
          <li><Link to="/Contact">Contact</Link></li>
          <li><Link to="/Logout">Logout</Link></li>
        </>
      )
    } else {
      return (

        <>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/About">About</Link></li>
          <li><Link to="/Courses">Courses</Link></li>
          <li><Link to="/Contact">Contact</Link></li>
          <li><Link to="/Signup">Signup</Link></li>
          <li><Link to="/Login">Login</Link></li>
        </>
      )
    }
  }

  const [scrollTop, setScrollTop] = useState(0)
  const [Nav, SetNav] = useState("Null")

  const connection = (e) => {
    e.preventDefault()
    const menu = document.querySelector(".nav_menu")
    const menuBtn = document.querySelector("#open-menu-btn")
    const closeBtn = document.querySelector("#close-menu-btn")

    menuBtn.addEventListener('click', () => {
      menu.style.display = "flex"
      closeBtn.style.display = "inline-block"
      menuBtn.style.display = "none"
    })

    // close nav menu
    const closeNav = () => {
      menu.style.display = "none"
      closeBtn.style.display = "none"
      menuBtn.style.display = "inline-block"
    }

    closeBtn.addEventListener('click', closeNav)

  }

  const handleOnChange = (Event) => {
    setScrollTop(Event.currentTarget.scrollTop)
  }

  const handleChange = (e) => {
    SetNav(e.target.value)
  }

  const OnScroll = () => {
    setScrollTop(
      window.addEventListener('scroll', () => {
        document.querySelector('nav').classList.toggle
          ('window-scroll', window.scrollY > 0)
      }))
  }
  return (
    <>
      <nav value={scrollTop} onChange={handleOnChange} onClick={OnScroll}>
        <div className="containers nav_container">
          <NavLink to="/">
            <h4>{props.heading}</h4>
          </NavLink>
          <ul className="nav_menu">
            <RenderMenu />
          </ul>
          <button id="open-menu-btn" value={Nav} onChange={handleChange} onClick={(e)=>connection(e)}><i className="uil uil-bars"></i></button>
          <button id="close-menu-btn"><i className="uil uil-multiply"></i></button>
        </div>
      </nav>
    </>
  )
}

export default Navbar
