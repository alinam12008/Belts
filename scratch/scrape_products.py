import urllib.request
import re

url = "https://belts-store.com/product-category/belts_power_transmission/"
headers = {'User-Agent': 'Mozilla/5.0'}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        
        # WooCommerce title wrappers
        print("Product titles and links:")
        matches = re.findall(r'<p class="[^"]*product-title[^"]*"><a href="([^"]+)">([^<]+)</a></p>', html)
        for link, title in matches:
            print(f"Title: {title.strip()}")
            print(f"Link: {link}")
            
        # Fallback 1: any link inside title-wrapper
        if not matches:
            matches2 = re.findall(r'<a class="[^"]*woocommerce-LoopProduct-link[^"]*" href="([^"]+)">.*?<h2[^>]*>([^<]+)</h2>', html, re.DOTALL)
            for link, title in matches2:
                print(f"Title2: {title.strip()}")
                
        # Fallback 2: search for boxes and titles
        if not matches and not matches2:
            # Let's search for "<div class=\"title-wrapper\">"
            idx = 0
            while True:
                idx = html.find("title-wrapper", idx)
                if idx == -1:
                    break
                print("Title wrapper context:")
                print(html[idx:idx+400])
                idx += len("title-wrapper")
except Exception as e:
    print(f"Error: {e}")
