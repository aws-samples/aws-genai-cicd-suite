import React from 'react';

const Hero = () => {
  return (
    <section className="py-12 sm:py-20 bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-purple-600 text-transparent bg-clip-text">
            Elevate Your DevOps Pipeline with Generative AI
          </h2>
          <p className="text-lg sm:text-xl mb-6 sm:mb-8 text-gray-600">Unleash the power of our AI-driven DevOps solution to streamline your workflows, boost productivity, and transform your IT landscape.</p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <a href="#quickstart" className="bg-blue-600 text-white px-6 sm:px-8 py-3 rounded-full font-bold hover:bg-blue-700 transition duration-300">Get Started</a>
            <a href="https://github.com/aws-samples/aws-genai-cicd-suite" target="_blank" rel="noopener noreferrer" className="bg-gray-200 text-gray-800 px-6 sm:px-8 py-3 rounded-full font-bold hover:bg-gray-300 transition duration-300">It's Open Sourced!</a>
          </div>
        </div>

        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
            <iframe
              src="https://www.youtube.com/embed/0RtqGIHk9bY"
              title="AWS GenAI CI/CD Suite Demo"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;