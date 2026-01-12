import { UserType } from "../models/UserType"; // यदि हो तो, नहीं है तो ignore

declare global {
  namespace Express {
    interface Request {
      user?: any; // or your exact user type
    }
  }
}
