import express from 'express';
import type { Request, Response } from 'express';
import Stripe from 'stripe';
const router = express.Router();

import db from '../assets/ts/database.js';
import { Benefits, get_benefits_by_planId, get_silver_plan, type Plan } from '../assets/ts/plan.js';
import { User } from '../assets/ts/types.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// route de gestion de plan
router.post('/plan/set', async (req: Request, res: Response) => {

  const { userId, planId, customerId, plan_data, sub_id } = req.body;

  if (!userId || !planId) return;

  try {

    await db.set_user_plan(userId, planId, sub_id, customerId, plan_data);
    
    res.cookie('_sub', sub_id, {
      httpOnly: true,
      secure: true,
    });

  }
  catch (err) {
    res.json({ error: true, message: err });
    throw err;
  }

  res.json(true);

})


router.get('/plan/get', async (req: Request, res: Response) => {

  const userId = String(req.query.userId);
  if (!userId) {
    res.status(403).json({ error: true, message: 'Missing query' })
    return;
  }

  const user: User | null = await db.get_user(userId);
  if (!user) {
    res.status(503).json({ error: true, message: 'User not found' });
    return;
  }

  try {

    const plans: Plan[] = user.plan;

    if (plans[0].uuid == 'e9009da1-e1e6-448d-b264-353ba8c0a850') {
      res.json(get_silver_plan());
      return;
    }

    const subscriptions = await stripe.subscriptions.list({
        customer: user.customerId,
        status: 'active',
        expand: ["data.default_payment_method"],
        limit: 1,
    });

    const stripPlan = subscriptions.data[0];
    if (!stripPlan) {
      res.json(get_silver_plan());
      return;
    }
    
    const plan: Plan | undefined = plans.find(plan => plan.sub_id == stripPlan.id);
    if (!plan) throw Error('Plan was undefined');
    const benefits: Benefits | undefined = get_benefits_by_planId(plan.uuid);
    if (!benefits) throw Error('Benefits was undefined');
    
    res.cookie('_sub', plan.sub_id, {
        httpOnly: true,
        secure: true,
    });

    res.json({
      ...plan,
      benefits
    });

  }
  catch(err) {
    throw new Error(`An error ocured on user/plan/get : ${err}`);
  }

})


// route de création de session
router.post('/session/create', async (req: Request, res: Response) => {

  res.json({});
  return;

  const { platform, userId }: { platform: string, userId: string } = req.body; // platform => app type (web, electron, capacitor)
  let sessions; 

  if (!userId) return

  try {

    if (!await db.exist_user(userId)) return;

    sessions = await db.new_session(userId);

    if (platform == 'web') {

      res.cookie('session_id', sessions.id, {
        httpOnly: true,
        secure: true,
      });

      res.cookie('user_id', userId, {
        httpOnly: true,
        secure: true,
      });

      res.cookie('_platform', 'web', {
        httpOnly: true,
        secure: true,
      });

    }

  }
  catch (err) {
    res.json({ error: true, message: err });
    throw err;
  }

  res.json(sessions);

})

// route de fermeture de session
router.post('/session/close', async (req: Request, res: Response) => {

  res.json({});
  return;

  const session_id: any = req.cookies.session_id;

  const sessions = await db.verify_session(session_id);
  
  if (sessions) {

    const close = await db.close_session(session_id)

    res.clearCookie('session_id');

    res.clearCookie('user_id');

    res.json(close);

  }

})


// route de vérification de session
router.post('/session/verify', async (req: Request, res: Response) => {

  res.json({});
  return;

  const session_id = req.cookies.session_id;

  const sessions: boolean = await db.verify_session(session_id);
  
  res.json(sessions);

})


router.post('/get/data', async (req: Request, res: Response) => {

  const { user_id } = req.body;

  const user = await db.get_user(user_id);

  res.json(user);

})




router.get('/stripe/portal/for/:id', async (req: Request, res: Response) => {

  const customerId = req.params.id;

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: 'https://www.silvernote.fr/user/profile',
  });

  if (req.query.redirect == '1') return res.redirect(session.url);
  res.json({ url: session.url });

});

router.post('/stripe/cancel/sub', async (req: Request, res: Response) => {

  const { subId } = req.body;

  const response = await stripe.subscriptions.update(subId, {
    cancel_at_period_end: true,
  });

  res.json(response || true);

});






async function createStripeCustomer(user: {
    email: string;
    name?: string;
    metadata?: Record<string, string>;
}) {
    const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
    });

    console.log("Customer créé :", customer.id);
    return customer.id; // ex : 'cus_L8s9erM3DvJt2a'
}



router.post('/create', async (req: Request, res: Response) => {

  const user = req.body.user;

  if (!await db.exist_user(user.id)) {

    const strip_user_id: string = await createStripeCustomer({
      email: String(user.emailAddresses[0].emailAddress),
      name: user.fullName!
    })

    await db.add_user({
      userId: user.id,
      customerId: strip_user_id,
      planId: 'Silver'
    })

  };

  res.cookie('user_id', user.id, {
    httpOnly: true,
    secure: false,
  });

  res.json(await db.get_user(user.id));
  
})

router.post('/verify', async (req: Request, res: Response) => {

  const { user_id } = req.body;

  res.json(await db.exist_user(user_id));
  
})



export default router;