import express, {Request, Response, NextFunction, Router} from "express";
const router: Router = express.Router({
    caseSensitive: true
})

router.get("/status", async function (req: Request, res: Response, next: NextFunction): Promise<any> {
     return res.status(200).send("OK")
})

export { router }