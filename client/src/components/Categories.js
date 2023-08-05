import React from 'react'
import '../css/App.css'
import { Link } from 'react-router-dom'

const Categories = (props) => {
    return (
        <>
            <section className="categories">
                <div className="container categories_container">
                    <div className="categories_left">
                        <h1>Categories</h1>
                        <p>Invariable advice to people Learn how to cook, try new recipes, learn from your mistakes, be
                            fearless, and above all have fun</p>
                        <Link to="/Courses" className="btn">Learn More</Link>
                    </div>
                    <div className="categories_right">
                        <article className="category">
                            <span className="category_icon">
                                <i className="fa-solid fa-house-user">
                                </i>
                            </span>
                            <h5>Baking & Desserts</h5>
                            <p>Warm, homemade treats have never been easier to make than with these delicious baked desserts
                                recipes</p>
                        </article>

                        <article className="category">
                            <span className="category_icon" style={{backgroundColor: "#f75842"}}>
                                <i className="fa-sharp fa-solid fa-circle-info"></i>
                            </span>
                            <h5>Bakery & Pastry</h5>
                            <p>It looked like the world was covered in a cobbler crust of brown sugar and cinnamon</p>
                        </article>

                        <article className="category">
                            <span className="category_icon" style={{backgroundColor: "#00bf8e"}}>
                                <i className="fa-solid fa-cake-candles"></i>
                            </span>
                            <h5>Cake Decoration</h5>
                            <p>Life is too short to say no to cake</p>
                        </article>

                        <article className="category">
                            <span className="category_icon" style={{backgroundColor: "#f7c94b"}}>
                                <i className="fa-brands fa-github"></i>
                            </span>
                            <h5>Culinary Arts</h5>
                            <p>A chef is a mixture maybe of artistry and craft. You have to learn the craft really to get there
                            </p>
                        </article>

                        <article className="category">
                            <span className="category_icon" style={{backgroundColor: "#00bf8e"}}>
                                <i className="fa-solid fa-hand-sparkles nav_icon"></i>
                            </span>
                            <h5>Food Safety and Hygiene</h5>
                            <p>We are going to do everything possible to make sure that food safety and Hygiene is always
                                paramount</p>
                        </article>

                        <article className="category">
                            <span className="category_icon">
                                <i className="fa-solid fa-bowl-food"></i>
                            </span>
                            <h5>Young Chef Planner</h5>
                            <p>A recipe has no soul. You as the cook must bring soul to the recipe</p>
                        </article>
                    </div>
                </div>
            </section>

        </>
    )
}

export default Categories
