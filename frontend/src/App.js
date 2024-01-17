import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Header from "./components/Header";
import About from "./components/About";
import Resume from "./components/Resume";
import Testimonials from "./components/Testimonials";
import ContactUs from "./components/ContactUs";
import Footer from "./components/Footer";
import resumeData from "./resumeData";
import AudioPlayer from "./components/AudioPlayer";
import GunksHardest from "./components/GunksHardest";

function App() {
  return (
    <HelmetProvider>
      <Router>
        <Routes>
          <Route
            exact
            path="/"
            element={
              <>
                <Header resumeData={resumeData} />
                <About resumeData={resumeData} />
                <Resume resumeData={resumeData} />
                <Testimonials resumeData={resumeData} />
                <ContactUs resumeData={resumeData} />
                <Footer resumeData={resumeData} />
              </>
            }
          />
          <Route path="/meeting" element={<AudioPlayer />} />
          <Route path="/gunkshardest" element={<GunksHardest />} />
        </Routes>
      </Router>
    </HelmetProvider>
  );
}

export default App;
