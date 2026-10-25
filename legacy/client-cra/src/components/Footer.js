import React from 'react'
import '../css/App.css'
import { Link } from 'react-router-dom'

const Footer = () => {
  return (
    <>
      <footer className="footer">
        <div className="container footer_container">
            <div className="footer_1">
                <Link to="/" className="footer_logo">
                    <h4>Cake_Town</h4>
                </Link>
                <p>
                    Grow your skills to advance your career path
                </p>
            </div>

            <div className="footer_2">
                <h4>Permalinks</h4>
                <ul className="permalinks">
                    <li><Link to="/">Home</Link></li>
                    <li><Link to="/About">About</Link></li>
                    <li><Link to="/Courses">Courses</Link></li>
                    <li><Link to="/Contact">Contact</Link></li>
                </ul>
            </div>

            <div className="footer_3">
                <h4>Privacy</h4>
                <ul className="privacy">
                    <li><Link to="https://termify.io/privacy-policy-generator?gclid=CjwKCAiAlp2fBhBPEiwA2Q10D3VgP2peEMcFPuwxJZwKBHLGeGBOxR9xHj0iCQLc6f5YUH4axEm6TxoCdY8QAvD_BwE"
                            target="_blank"  >Privacy Policy</Link></li>
                    <li><Link to="https://termify.io/privacy-policy-generator?gclid=CjwKCAiAlp2fBhBPEiwA2Q10D3VgP2peEMcFPuwxJZwKBHLGeGBOxR9xHj0iCQLc6f5YUH4axEm6TxoCdY8QAvD_BwE"
                            target="_blank" >Terms and Conditions</Link></li>
                    <li><Link to="https://termify.io/privacy-policy-generator?gclid=CjwKCAiAlp2fBhBPEiwA2Q10D3VgP2peEMcFPuwxJZwKBHLGeGBOxR9xHj0iCQLc6f5YUH4axEm6TxoCdY8QAvD_BwE"
                            target="_blank" >Refund Policy</Link></li>
                </ul>
            </div>

            <div className="footer_4">
                <h4>Contact Us</h4>
                <div>
                    <p>+01 234 567 8910</p>
                    <p>caketown@gmail.com</p>
                </div>

                <ul className="footer_socials">
                    <li><Link to="https://facebook.com" target="_blank"><i className="uil uil-facebook-f"></i></Link></li>
                    <li><Link to="https://instagram.com" target="_blank"><i className="uil uil-instagram"></i></Link></li>
                    <li><Link to="https://twitter.com" target="_blank"><i className="uil uil-twitter"></i></Link></li>
                    <li><Link to="/Contact" target="_blank"><i className="uil uil-message"></i></Link></li>
                </ul>
            </div>
        </div>
        <div className="footer_copyright">
            <small>All Copyright Reversed | &copy; Cake_Town</small>
        </div>
    </footer>
    </>
  )
}

export default Footer
