import React from 'react'
import Navbar from '../components/Navbar'
import HomeBanner from '../components/HomeBanner'
import HomeCars from '../components/HomeCars'
import RecommendedCars from '../components/RecommendedCars'
import Testimonial from '../components/Testimonial'
import Footer from '../components/Footer'

function Home() {
  return (
    <div>
      <Navbar/>
      <HomeBanner/>
      <RecommendedCars/>
      <HomeCars/>
      <Testimonial/>
      <Footer/>
    </div>
  )
}

export default Home
