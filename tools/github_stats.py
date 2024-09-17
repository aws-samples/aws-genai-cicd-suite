import requests
import os
from datetime import datetime, timedelta
import logging
import time
import sys

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def fetch_data(url, headers=None, params=None):
    while True:
        try:
            # Convert any integer values in params to strings
            if params:
                params = {k: str(v) if isinstance(v, int) else v for k, v in params.items()}
            
            response = requests.get(url, headers=headers, params=params, timeout=10)
            response.raise_for_status()
            remaining = int(response.headers.get('X-RateLimit-Remaining', 0))
            if remaining < 2:
                reset_time = int(response.headers.get('X-RateLimit-Reset', 0))
                sleep_time = max(reset_time - time.time(), 0) + 1
                logging.warning(f"Rate limit almost exhausted. Sleeping for {sleep_time:.2f} seconds.")
                sleep_with_progress(sleep_time)
            return response.json(), response.headers
        except requests.exceptions.RequestException as e:
            if hasattr(e, 'response') and e.response is not None and e.response.status_code == 403:
                reset_time = int(e.response.headers.get('X-RateLimit-Reset', 0))
                sleep_time = max(reset_time - time.time(), 0) + 1
                logging.warning(f"Rate limit exceeded. Sleeping for {sleep_time:.2f} seconds.")
                sleep_with_progress(sleep_time)
            else:
                logging.error(f"Error fetching data: {e}")
                return None, None

def sleep_with_progress(sleep_time):
    for i in range(int(sleep_time)):
        # round the time to 0.1 seconds
        sleep_time = round((sleep_time - i)/1000, 1)
        sys.stdout.write(f"\rSleeping: {sleep_time:.1f} seconds remaining")
        sys.stdout.flush()
        time.sleep(1)
    sys.stdout.write("\rResuming fetching data...                 \n")
    sys.stdout.flush()

def get_github_stats(repo, days=30):
    # GitHub API endpoint
    api_url = f"https://api.github.com/repos/{repo}"
    
    # Get GitHub token from environment variable
    github_token = os.environ.get("GITHUB_TOKEN")
    if not github_token:
        raise ValueError("GITHUB_TOKEN environment variable is not set")

    # Set up headers for authentication
    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json"
    }

    # Calculate the date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    # Initialize counters
    stats = {
        "pr_created": 0,
        "pr_updated": 0,
        "pr_closed": 0,
        "issues_opened": 0,
        "issues_closed": 0,
        "issue_comments": 0
    }

    # Fetch pull requests
    pr_url = f"{api_url}/pulls"
    pr_params = {
        "state": "all",
        "sort": "updated",
        "direction": "desc",
        "per_page": 100
    }
    
    page = 1
    while True:
        logging.info(f"Fetching pull requests page {page}")
        prs, headers = fetch_data(pr_url, headers=headers, params=pr_params)
        if not prs:
            break
        
        for pr in prs:
            pr_created_at = datetime.strptime(pr["created_at"], "%Y-%m-%dT%H:%M:%SZ")
            pr_updated_at = datetime.strptime(pr["updated_at"], "%Y-%m-%dT%H:%M:%SZ")
            
            if start_date <= pr_created_at <= end_date:
                stats["pr_created"] += 1
            
            if start_date <= pr_updated_at <= end_date:
                stats["pr_updated"] += 1
            
            if pr["closed_at"]:
                pr_closed_at = datetime.strptime(pr["closed_at"], "%Y-%m-%dT%H:%M:%SZ")
                if start_date <= pr_closed_at <= end_date:
                    stats["pr_closed"] += 1
        
        if 'next' not in requests.utils.parse_header_links(headers.get('Link', '')):
            break
        page += 1
        pr_params['page'] = page

    logging.info(f"Current stats after pull requests: {stats}")

    # Fetch issues
    issue_url = f"{api_url}/issues"
    issue_params = {
        "state": "all",
        "sort": "updated",
        "direction": "desc",
        "per_page": 100
    }
    
    page = 1
    while True:
        logging.info(f"Fetching issues page {page}")
        issues, headers = fetch_data(issue_url, headers=headers, params=issue_params)
        if not issues:
            break
        
        for issue in issues:
            if "pull_request" in issue:
                continue  # Skip pull requests
            
            issue_created_at = datetime.strptime(issue["created_at"], "%Y-%m-%dT%H:%M:%SZ")
            
            if start_date <= issue_created_at <= end_date:
                stats["issues_opened"] += 1
            
            if issue["closed_at"]:
                issue_closed_at = datetime.strptime(issue["closed_at"], "%Y-%m-%dT%H:%M:%SZ")
                if start_date <= issue_closed_at <= end_date:
                    stats["issues_closed"] += 1

            # Fetch issue comments
            comments_url = issue["comments_url"]
            comments, _ = fetch_data(comments_url, headers=headers)
            if comments:
                for comment in comments:
                    comment_created_at = datetime.strptime(comment["created_at"], "%Y-%m-%dT%H:%M:%SZ")
                    if start_date <= comment_created_at <= end_date:
                        stats["issue_comments"] += 1
        
        if headers and 'Link' in headers:
            if 'next' not in requests.utils.parse_header_links(headers['Link']):
                break
        else:
            break
        page += 1
        issue_params['page'] = page

    return stats

if __name__ == "__main__":
    repo = input("Enter the GitHub repository (format: owner/repo): ")
    days = int(input("Enter the number of days to analyze (default 30): ") or 30)
    
    try:
        stats = get_github_stats(repo, days)
        print(f"\nGitHub Stats for {repo} (last {days} days):")
        print(f"Pull Requests Created: {stats['pr_created']}")
        print(f"Pull Requests Updated: {stats['pr_updated']}")
        print(f"Pull Requests Closed: {stats['pr_closed']}")
        print(f"Issues Opened: {stats['issues_opened']}")
        print(f"Issues Closed: {stats['issues_closed']}")
        print(f"Issue Comments: {stats['issue_comments']}")
    except Exception as e:
        logging.exception(f"An error occurred: {str(e)}")