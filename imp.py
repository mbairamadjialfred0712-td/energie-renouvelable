import asyncio, json, os
from playwright.async_api import async_playwright
async def main():
    m=json.load(open(os.path.expanduser("~/.cache/lovable-auth/session.json")))
    async with async_playwright() as p:
        b=await p.chromium.launch(headless=True); pg=await (await b.new_context(viewport={"width":1280,"height":1800})).new_page()
        errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto("http://localhost:8080"); await pg.evaluate(f"localStorage.setItem({json.dumps(m['storage_key'])},{json.dumps(json.dumps(m['session']))})")
        await pg.goto("http://localhost:8080/geography/import"); await pg.wait_for_timeout(4000)
        await pg.set_input_files('input[type=file]','countries.csv'); await pg.wait_for_timeout(800)
        await pg.locator('input[type=checkbox]').check(); await pg.get_by_role("button",name="Importer").click(); await pg.wait_for_timeout(3000)
        print(await pg.locator("aside").inner_text())
        await pg.get_by_role("button",name="2. Régions").click()
        await pg.set_input_files('input[type=file]','regions.xlsx'); await pg.wait_for_timeout(1500)
        await pg.locator('input[type=checkbox]').check(); await pg.get_by_role("button",name="Importer").click(); await pg.wait_for_timeout(3000)
        await pg.screenshot(path="imp.png"); print(await pg.locator("aside").inner_text()); print(errs); await b.close()
asyncio.run(main())
