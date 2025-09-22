import React from 'react';
import { SignIn } from '@clerk/clerk-react';

const SignInPage = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
  </div>
);

export default SignInPage;