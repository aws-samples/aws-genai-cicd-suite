import React from 'react';

const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => (
  <div className="mb-8">
    <h3 className="text-xl font-semibold mb-2 text-gray-800">{question}</h3>
    <p className="text-gray-600">{answer}</p>
  </div>
);

const FAQ: React.FC = () => {
  const faqs = [
    {
      question: "How do I set up AWS GenAI CI/CD Suite?",
      answer: "Setting up AWS GenAI CI/CD Suite involves configuring IAM to trust GitHub, setting up AWS credentials, cloning and publishing the action, and configuring your GitHub workflow. Detailed steps are provided in the Quick Start guide."
    },
    {
      question: "What AWS services does AWS GenAI CI/CD Suite use?",
      answer: "AWS GenAI CI/CD Suite primarily uses AWS Bedrock API for its AI-driven features. It also requires proper IAM configuration for secure access to AWS services."
    }
  ];

  return (
    <section id="faq" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold mb-12 text-center text-gray-800">Frequently Asked Questions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12 max-w-6xl mx-auto">
          {faqs.map((faq, index) => (
            <FAQItem key={index} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;