import React from 'react';
import { SignUp } from '@clerk/clerk-react';

const SignUpPage = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <SignUp
      routing="path"
      path="/sign-up"
      signInUrl="/sign-in"
      afterSignUpUrl="/"
    />
  </div>
);

export default SignUpPage;