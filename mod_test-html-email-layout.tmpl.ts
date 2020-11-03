import * as helpers from "./template-helpers.ts";
import * as xt from "./xml-tag.ts";

export const p = xt.xmlTag("p");

export interface EmailMessageContent {
  readonly heading: string;
  readonly body: string;
  readonly signature?: string;
}

export const [isValidEmailMessageContent, onInvalidEmailMessageContent] =
  helpers.contentGuard<EmailMessageContent>("heading", "body");

export function anchorTip(href: string): string {
  return p
    `If you find any difficulty in clicking the above link, please copy and paste the below url into your browser.` +
    p`${href}`;
}

export function callToActionButton(text: string, href: string): string {
  return `
      <table style="width:200px;height:40px;">
        <tbody>
          <tr>
            <td style="background-color:#1a4e7a;height:30px;width:475px;text-align: center;vertical-align: middle;border-radius: 5px;">
                <a href="${href}"
                    style="color:#FFF;height:30px;width:200px;text-decoration:none !important; font-size:15px;text-decoration:none;">
                    ${text}
                </a>
            </td>
          </tr>
        </tbody>
      </table>`;
}

export function executeTemplate(content: EmailMessageContent): string {
  const signature = content.signature ||
    "<p>Thank you,<br/>Netspective Business Operations Team.</p>";
  return `
  <!DOCTYPE html
      PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  
  <html xmlns="http://www.w3.org/1999/xhtml">
  
  <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>:: Mail Template ::</title>
      <!-- Designed by https://github.com/kaytcat -->
      <!-- Header image designed by Freepik.com -->
      <style type="text/css">
          /* Take care of image borders and formatting */
  
          img {
              max-width: 600px;
              outline: none;
              text-decoration: none;
              -ms-interpolation-mode: bicubic;
          }
  
          a img {
              border: none;
          }
  
          table {
              border-collapse: collapse !important;
          }
  
          #outlook a {
              padding: 0;
          }
  
          .ReadMsgBody {
              width: 100%;
          }
  
          .ExternalClass {
              width: 100%;
          }
  
          .backgroundTable {
              margin: 0 auto;
              padding: 0;
              width: 100% !important;
          }
  
          table td {
              border-collapse: collapse;
          }
  
          .ExternalClass * {
              line-height: 115%;
          }
  
          /* General styling */
  
          td {
              font-family: Arial, sans-serif;
              color: #5e5e5e;
              font-size: 16px;
              text-align: left;
          }
  
          body {
              -webkit-font-smoothing: antialiased;
              -webkit-text-size-adjust: none;
              width: 100%;
              height: 100%;
              color: #5e5e5e;
              font-weight: 400;
              font-size: 16px;
          }
  
          h1 {
              margin: 10px 0;
          }
  
          a {
              color: #2b934f;
              text-decoration: none;
          }
  
          .body-padding {
              padding: 0 75px;
          }
  
          .force-full-width {
              width: 100% !important;
          }
  
          .logo {
              text-align: left;
              padding-left: 30px;
          }
  
          .computer-image {
              padding-left: 30px;
          }
  
          .header-text {
              text-align: left;
              padding-right: 30px;
              padding-left: 20px;
          }
  
          .header {
              color: #1b629e;
              font-size: 24px;
          }
  
          .note-footer {
              font-size: 11px;
              font-style: italic;
              color: #989898;
              padding-top: 15px;
          }
  
          .regards {
              font-size: 14px;
          }
  
          .copyright {
              color: #999696;
              background-color: #f5f5f5;
              font-size: 13px;
              text-align: center;
          }
  
          .logo-section {
              border-bottom: 1px solid #ccc;
              border-top: 5px solid #1a4e7a;
          }
  
          .mailer-details-section {
              border-bottom: 1px solid #efefef;
              border-top: 1px solid #efefef;
          }
  
          .mailer-details td {
              color: #1D4C8D;
              font-size: 13px;
              width: 20%;
          }
  
          .mailer-details img {
              width: 17px;
              margin-top: 7px;
          }
      </style>
      <style type="text/css" media="screen">
          @media screen {
              @import url(http://fonts.googleapis.com/css?family=PT+Sans:400,700);
  
              /* Thanks Outlook 2013! */
              * {
                  font-family: 'PT Sans', 'Helvetica Neue', 'Arial', 'sans-serif' !important;
              }
          }
      </style>
      <style type="text/css" media="only screen and (max-width: 599px)">
          /* Mobile styles */
  
          @media only screen and (max-width: 599px) {
              table[class*="w320"] {
                  width: 320px !important;
              }
  
              td[class*="icons"] {
                  display: block !important;
                  text-align: center !important;
                  padding: 0 !important;
              }
  
              td[class*="logo"] {
                  display: block !important;
                  text-align: center !important;
                  padding: 0 !important;
              }
  
              td[class*="computer-image"] {
                  display: block !important;
                  width: 230px !important;
                  padding: 0 45px !important;
                  border-bottom: 1px solid #e3e3e3 !important;
              }
  
              td[class*="header-text"] {
                  display: block !important;
                  text-align: center !important;
                  padding: 0 25px !important;
                  padding-bottom: 25px !important;
              }
  
              *[class*="mobile-hide"] {
                  display: none !important;
                  width: 0 !important;
                  height: 0 !important;
                  line-height: 0 !important;
                  font-size: 0 !important;
              }
          }
      </style>
  </head>
  
  <body offset="0" class="body"
      style="padding:0; margin:0; display:block; background:#ebecee; -webkit-text-size-adjust:none" bgcolor="#ebecee">
      <table align="center" cellpadding="0" cellspacing="0" width="100%" height="100%">
          <tr>
              <td align="center" valign="top" style="background-color:#ebecee" width="100%">
                  <center>
                      <table cellspacing="0" cellpadding="0" width="600" class="w320">
                          <tr>
                              <td align="center" valign="top">
                                  <table class="force-full-width logo-section" cellspacing="0" cellpadding="0"
                                      bgcolor="#fff"
                                      style="border-bottom: 1px solid #ccc; border-top: 5px solid #1a4e7a;">
                                      <tr>
                                          <td style="background-color:#fff; width:150px;" class="logo">
                                              <br>
                                              <a href="#" style="width:150px;"><img
                                                      src="https://github.com/medigy/assets-public/raw/master/brand/medigy-logo-large-transparent-for-light-background.png"
                                                      alt="Medigy" width="150" /></a>
                                              <br><br>
                                          </td>
                                      </tr>
                                  </table>
                                  <table class="force-full-width" cellspacing="0" cellpadding="30" bgcolor="#fff">
                                      <tr>
                                          <td
                                              style="background-color: #f5f5f5; padding: 15px 30px; color:#1a4e7a; font-size:22px; line-height:22px; text-align:left;">
                                              ${content.heading}
                                          </td>
                                      </tr>
                                  </table>
                                  <table class="force-full-width" cellspacing="0" cellpadding="30" bgcolor="#fff">
                                      <tr>
                                          <td style="background-color: #fff;">
                                              <table border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
                                                  <tr>
                                                      <td
                                                          style="background-color: #fff; color:#5E5E5E; font-size:13px; text-align:left; line-height:18px;">
                                                          ${content.body}
                                                      </td>
                                                  </tr>
                                              </table>
                                          </td>
                                      </tr>
                                      <tr>
                                          <td style="background-color: #fff;">
                                              <table cellspacing="0" cellpadding="0" class="force-full-width">
                                                  <tr>
                                                      <td class="regards">
                                                          ${signature}
                                                      </td>
                                                  </tr>
                                              </table>
                                          </td>
                                      </tr>
                                  </table>
                                  <table class="force-full-width" cellspacing="0" cellpadding="20" bgcolor="#f5f5f5">
                                      <tr>
                                          <td class="copyright"
                                              style="color: #999696; background-color: #f5f5f5; font-size: 13px; text-align: center;">
                                              <p>www.medigy.com is a Netspective Media, LLC Property.</p>
                                              <p>2313 Falling Creek Road, Silver Spring, MD 20904. +1 202 660-1351</p>,
                                          </td>
                                      </tr>
                                  </table>
                              </td>
                          </tr>
                      </table>
                  </center>
              </td>
          </tr>
      </table>
  </body>
  
  </html>`;
}

export default [
  executeTemplate,
  isValidEmailMessageContent,
  onInvalidEmailMessageContent,
];
