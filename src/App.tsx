import React from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import SignIn from "./page/auth/SignIn";
import SignUp from "./page/auth/SignUp";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/sign-up' element={<SignUp/>}/>
        <Route path="/sign-in" element={<SignIn/>}/>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
