import React from 'react'
import '../css/App.css'
import Piyush from '../images/piyush.jpg'
import Keshari from '../images/keshari.jpg'
import Aftab from '../images/aftab.jpg'
import Photo from '../images/photo.jpg'
import Peeasha from '../images/Peeasha.jpg'

import { Swiper, SwiperSlide } from "swiper/react";

// Import Swiper styles
import "swiper/css";
import "swiper/css/pagination";

// import "./styles.css";
import { Pagination } from "swiper";

const Testimonal = () => {
    return (
        <>
            <Swiper
                spaceBetween={30}
                loop={true}
                pagination={{
                    clickable: true,
                }}
                modules={[Pagination]}
                className="mySwiper"
            >
                <section className="container testimonals_container mySwiper">
                    <h2>Students' Testimonial</h2>
                    <div className="swiper-wrapper testimo">
                        {/* <!-- 1 --> */}
                        <SwiperSlide className="testimonal swiper-slide">
                            <div className="avatar">
                                <img src={Piyush} alt="" />
                            </div>
                            <div className="testimonal_info">
                                <h5>Piyush Keshari</h5>
                                <small>Student</small>
                            </div>
                            <div className="testimonal_body">
                                <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptate ea cumque consequuntur
                                    inventore possimus nobis ipsum neque, dignissimos vel.</p>
                            </div>
                        </SwiperSlide>
                        {/* <!-- 2 --> */}
                        <SwiperSlide className="testimonal swiper-slide">
                            <div className="avatar">
                                <img src={Keshari} alt="" />
                            </div>
                            <div className="testimonal_info">
                                <h5>Himanshu Singh</h5>
                                <small>Student</small>
                            </div>
                            <div className="testimonal_body">
                                <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptate ea cumque consequuntur
                                    inventore possimus nobis ipsum neque, dignissimos vel.</p>
                            </div>
                        </SwiperSlide>
                        {/* <!-- 3 --> */}
                        <SwiperSlide className="testimonal swiper-slide">
                            <div className="avatar">
                                <img src={Aftab} alt="" />
                            </div>
                            <div className="testimonal_info">
                                <h5>Aftab Ahmed</h5>
                                <small>Student</small>
                            </div>
                            <div className="testimonal_body">
                                <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptate ea cumque consequuntur
                                    inventore possimus nobis ipsum neque, dignissimos vel.</p>
                            </div>
                        </SwiperSlide>
                        {/* <!-- 4 --> */}
                        <SwiperSlide className="testimonal swiper-slide">
                            <div className="avatar">
                                <img src={Photo} alt="" />
                            </div>
                            <div className="testimonal_info">
                                <h5>Mukesh Singh</h5>
                                <small>Student</small>
                            </div>
                            <div className="testimonal_body">
                                <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptate ea cumque consequuntur
                                    inventore possimus nobis ipsum neque, dignissimos vel.</p>
                            </div>
                        </SwiperSlide>
                        {/* <!-- 5 --> */}
                        <SwiperSlide className="testimonal swiper-slide">
                            <div className="avatar">
                                <img src={Peeasha} alt="" />
                            </div>
                            <div className="testimonal_info">
                                <h5>Peeasha Das</h5>
                                <small>Student</small>
                            </div>
                            <div className="testimonal_body">
                                <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptate ea cumque consequuntur
                                    inventore possimus nobis ipsum neque, dignissimos vel.</p>
                            </div>
                        </SwiperSlide>
                    </div>
                    <div className="swiper-pagination"></div>

                </section>
            </Swiper>
        </>
    )
}

export default Testimonal
