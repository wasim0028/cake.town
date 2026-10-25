import React, { createContext, useReducer } from 'react'
import Navbar from './components/Navbar'
import Home from './components/Home'
import About from './components/About'
import Footer from './components/Footer'
import Courses from './components/Courses'
import Contact from './components/Contact'
import Signup from './components/Signup'
import Login from './components/Login'
import Logout from './components/Logout'
import Error from './components/Error'
import { BrowserRouter, Routes, Route, } from "react-router-dom";

import { initialState, reducer } from '../src/reducer/UseReducer'

export const UserContext = createContext()

const Routing = () => {
  return (
    <>
    <Routes>
      <Route path='/' element={<Home />} />
      <Route path='/About' element={<About />} />
      <Route path='/Courses' element={<Courses />} />
      <Route path='/Contact' element={<Contact />} />
      <Route path='/Signup' element={<Signup />} />
      <Route path='/Login' element={<Login />} />
      <Route path='/Logout' element={<Logout />} />
      <Route path="*" element={<Error />} />
    </Routes>
    </>
  )
}

const App = () => {

  const [state, dispatch] = useReducer(reducer, initialState)

  return (



    <UserContext.Provider value={{ state, dispatch }}>
      <BrowserRouter>
      <Navbar heading="Cake Town" />
      <Routing />
      <Footer />
      </BrowserRouter>
    </UserContext.Provider>

  )
}

export default App