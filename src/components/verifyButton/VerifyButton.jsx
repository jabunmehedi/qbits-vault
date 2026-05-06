import { useState } from "react";
import CustomModal from "../global/modal/CustomModal";

const VerifyButton = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div onClick={() => setOpen(true)} className="bg-indigo-500 text-white py-1.5 px-4 hover:bg-indigo-600 cursor-pointer rounded-full">
        <p>Verify</p>
      </div>

      {open && <CustomModal isCloseModal={() => setOpen(false)}></CustomModal>}
    </>
  );
};

export default VerifyButton;
