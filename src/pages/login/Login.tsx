import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Button, Card, Typography } from "antd";

const Login = () => {
  return (
    <motion.div
      className="w-screen min-h-screen flex flex-col items-center justify-center p-4"
      initial={{ opacity: 0, filter: "blur(8px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(8px)" }}
      transition={{ duration: 0.3 }}
    >
      <Card className="max-w-md w-full">
        <Typography.Title level={2} className="!mb-4">
          Login Page
        </Typography.Title>
        <Link to="/">
          <Button size="large">Back to Home</Button>
        </Link>
      </Card>
    </motion.div>
  );
};

export default Login;
