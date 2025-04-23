# This file checks the proxies in the assets directory

import json
import re

import requests

with open("proxies.json", "r") as file:
  data = json.load(file)

original_proxies_count = len(data["proxies"])
data["proxies"] = list(set(data["proxies"]))
duplicates_removed_count = original_proxies_count - len(data["proxies"])
print(f"Number of duplicate proxies removed: {duplicates_removed_count}")

expected_message_pattern = re.compile(
  r"Proxy is working as expected \(v\d+\.\d+\.\d+\)"
)

def is_proxy_working(url, index):
  try:
    response = requests.get(url, timeout=300)
    if response.status_code == 200:
      response_json = response.json()
      message = response_json.get("message", "")
      if expected_message_pattern.match(message):
        print(f"{index} | Proxy is working as expected: {url}")
        return True
  except Exception as e:
    print(f"{index} | Proxy is NOT working as expected: {e}")
  return False

# Calculate and print the estimated execution time
total_proxies = len(data["proxies"])
estimated_time_seconds = total_proxies * 1
estimated_time_minutes = estimated_time_seconds / 60
print(f"Estimated execution time: {estimated_time_minutes:.2f} mins")

working_proxies = [
  url for index, url in enumerate(data["proxies"]) if is_proxy_working(url, index)
]
non_working_proxies_count = total_proxies - len(working_proxies)
non_working_proxies_percentage = (non_working_proxies_count / total_proxies) * 100
data["proxies"] = working_proxies

print(f"Percentage of proxies that didn't work: {non_working_proxies_percentage:.2f}%")

with open("proxies.json", "w") as file:
  json.dump(data, file, indent=2)
  file.write("\n")
