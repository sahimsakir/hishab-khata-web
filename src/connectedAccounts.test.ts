import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ConnectedAccounts } from "./ConnectedAccounts";
import type { User } from "./types";
const user:User={id:1,name:"Test user",email:"user@example.com",email_verified_at:null,google_connected:false,google_login_available:true};
const render=(changes:Partial<User>={},path="/profile")=>renderToStaticMarkup(createElement(MemoryRouter,{initialEntries:[path]},createElement(ConnectedAccounts,{user:{...user,...changes}})));
describe("Google connection profile",()=>{
  it("shows connected status and email instead of a connect button",()=>{
    const html=render({google_connected:true,google_email:"user@example.com"});
    expect(html).toContain('Connected');expect(html).toContain('user@example.com');
    expect(html).not.toContain('Connect Google account');
  });
  it("shows a connect action for an unlinked account",()=>{
    const html=render();expect(html).toContain('Not connected');expect(html).toContain('Connect Google account');
  });
  it("disables linking if production Google credentials are unavailable",()=>{
    const html=render({google_login_available:false});expect(html).toContain('disabled=""');expect(html).toContain('not configured yet');
  });
  it("shows success and failure feedback on return to the profile",()=>{
    expect(render({google_connected:true},"/profile?google=connected")).toContain('Google account connected successfully.');
    expect(render({},"/profile?google_error=1")).toContain('Google could not be connected.');
  });
});
