import Drawer from "../../global/drawer/Drawer";

const OrderDetailsDrawer = ({ isOpen, onClose }) => {
  return <Drawer isOpen={isOpen} onClose={onClose} title="Order Details"></Drawer>;
};

export default OrderDetailsDrawer;
