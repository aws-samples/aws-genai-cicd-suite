import React from 'react';

const FeatureItem: React.FC<{ title: string; description: string; icon: React.ReactNode }> = ({ title, description, icon }) => (
  <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition duration-300">
    <div className="flex items-center mb-4">
      <div className="bg-blue-100 p-2 rounded-full mr-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
    </div>
    <p className="text-gray-600">{description}</p>
  </div>
);

const ComparisonCard: React.FC<{ title: string; traditional: string[]; innovative: string[] }> = ({ title, traditional, innovative }) => (
  <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition duration-300 flex-1">
    <h3 className="text-xl font-semibold text-gray-800 mb-4">{title}</h3>
    <div className="flex flex-col md:flex-row justify-between">
      <div className="w-full md:w-1/2 mb-4 md:mb-0 md:pr-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold text-gray-600">Traditional Approach</h4>
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <ul className="list-none pl-0">
          {traditional.map((item, index) => (
            <li key={index} className="flex items-start mb-2">
              <span className="text-gray-600 mr-2">•</span>
              <span className="text-gray-600">{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="w-full md:w-1/2 md:pl-4 border-t-2 md:border-t-0 md:border-l-2 border-gray-200 pt-4 md:pt-0">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-transparent bg-clip-text">AWS GenAI CI/CD Suite Approach</h4>
          <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
        </div>
        <ul className="list-none pl-0">
          {innovative.map((item, index) => (
            <li key={index} className="flex items-start mb-2">
              <span className="text-gray-600 mr-2">•</span>
              <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-transparent bg-clip-text">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

const Features: React.FC = () => {
  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="relative mb-12">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center">
            <h2 className="text-4xl font-bold px-4 bg-gray-50 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text">
              <span className="bg-gray-50 px-4">Streamline Your Development Workflow</span>
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <FeatureItem
            title="PR Content Generation"
            description="Automatically generate informative and actionable pull request content using AI-driven GitHub Actions."
            icon={<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>}
          />
          <FeatureItem
            title="Automated Code Review"
            description="Perform AI-driven code reviews to identify issues, suggest improvements, and ensure consistent best practices."
            icon={<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>}
          />
          <FeatureItem
            title="Unit Test Generation"
            description="Automatically generate unit tests to improve code quality and reduce the burden on developers."
            icon={<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>}
          />
          <FeatureItem
            title="Issue Operation"
            description="Interact with issues directly through PR comments, enabling AI-assisted repository analysis and code generation."
            icon={<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg>}
          />
        </div>
        
        <div className="relative mb-12">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center">
            <h3 className="text-3xl font-bold px-4 bg-gray-50 text-gray-800">
              Legacy vs Innovative
            </h3>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-8">
          <ComparisonCard
            title="Development Workflow Enhancement"
            traditional={[
              "Manual PR content creation",
              "Time-intensive code reviews",
              "Inconsistent review quality",
              "Risk of oversight in complex changes"
            ]}
            innovative={[
              "AI-powered PR descriptions",
              "Automated, comprehensive code analysis",
              "Consistent, high-quality feedback",
              "Advanced issue detection and resolution"
            ]}
          />
          <ComparisonCard
            title="Quality Assurance and Issue Management"
            traditional={[
              "Manual unit test development",
              "Limited test coverage",
              "Resource-intensive test maintenance",
              "Reactive issue management"
            ]}
            innovative={[
              "AI-generated unit tests",
              "Comprehensive test coverage",
              "Efficient test suite maintenance",
              "Proactive, AI-assisted issue resolution"
            ]}
          />
        </div>
      </div>
    </section>
  );
};

export default Features;