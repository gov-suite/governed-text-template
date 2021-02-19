import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";
import { config } from "https://deno.land/x/dotenv@v2.0.0/mod.ts";
const env = config();

export interface EmailParams {
  readonly mailBody: string;
  readonly mailSubject: string;
  readonly mailTo: string;
  readonly mailFrom: string;
}
export async function sendEmail(emailparams: EmailParams) {
  const client = new SmtpClient();
  await client.connect({
    hostname: env.HOSTNAME,
    port: Number(env.PORT),
    username: env.USERNAME,
    password: env.PASSWORD,
  });

  const emailSend = await client.send({
    from: emailparams.mailFrom,
    to: emailparams.mailTo,
    subject: emailparams.mailSubject,
    content: emailparams.mailBody,
    html: emailparams.mailBody,
  }).then((res) => {
    return "Mail Sent Successfully";
  }).catch((error) => {
    return "Could not send the mail";
  });
  await client.close();
  return emailSend;
}
